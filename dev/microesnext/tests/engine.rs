#![cfg(feature = "engine-tests")]

use core::ffi::{c_char, c_int, c_void};
use core::{mem, ptr, slice};
use microesnext as _;

type JsValue = usize;

#[repr(C)]
struct BytecodeHeader {
    magic: u16,
    version: u16,
    base_addr: usize,
    unique_strings: JsValue,
    main_func: JsValue,
}

enum Context {}

#[repr(C)]
struct StringBuffer {
    bytes: [u8; 5],
}

unsafe extern "C" {
    static js_stdlib: u8;

    fn JS_NewContext2(
        memory: *mut c_void,
        memory_size: usize,
        stdlib: *const c_void,
        prepare_compilation: c_int,
    ) -> *mut Context;
    fn JS_NewContext(
        memory: *mut c_void,
        memory_size: usize,
        stdlib: *const c_void,
    ) -> *mut Context;
    fn JS_FreeContext(context: *mut Context);
    fn JS_Parse(
        context: *mut Context,
        source: *const c_char,
        source_length: usize,
        filename: *const c_char,
        flags: c_int,
    ) -> JsValue;
    fn JS_PrepareBytecode(
        context: *mut Context,
        header: *mut BytecodeHeader,
        data: *mut *const u8,
        data_length: *mut u32,
        program: JsValue,
    );
    fn JS_RelocateBytecode2(
        context: *mut Context,
        header: *mut BytecodeHeader,
        data: *mut u8,
        data_length: u32,
        new_base_address: usize,
        update_atoms: c_int,
    ) -> c_int;
    fn JS_RelocateBytecode(context: *mut Context, bytecode: *mut u8, bytecode_length: u32)
    -> c_int;
    fn JS_LoadBytecode(context: *mut Context, bytecode: *const u8) -> JsValue;
    fn JS_Run(context: *mut Context, program: JsValue) -> JsValue;
    fn JS_GetException(context: *mut Context) -> JsValue;
    fn JS_ToCString(
        context: *mut Context,
        value: JsValue,
        buffer: *mut StringBuffer,
    ) -> *const c_char;
    fn JS_ToInt32(context: *mut Context, result: *mut c_int, value: JsValue) -> c_int;
    fn test_c_pstrcpy(dest: *mut c_char, size: c_int, source: *const c_char);
    fn test_c_pstrcat(dest: *mut c_char, size: c_int, source: *const c_char) -> *mut c_char;
    fn test_c_strstart(
        string: *const c_char,
        prefix: *const c_char,
        remainder: *mut *const c_char,
    ) -> c_int;
}

const JS_EXCEPTION: JsValue = 15;
const JS_EVAL_RETVAL: c_int = 1;
const ARENA_WORDS: usize = 256 * 1024;

fn stdlib() -> *const c_void {
    ptr::addr_of!(js_stdlib).cast()
}

fn assert_value(context: *mut Context, value: JsValue) {
    if value != JS_EXCEPTION {
        return;
    }
    let exception = unsafe { JS_GetException(context) };
    let mut buffer = StringBuffer { bytes: [0; 5] };
    let message = unsafe { JS_ToCString(context, exception, &mut buffer) };
    let message = if message.is_null() {
        "JavaScript exception".into()
    } else {
        unsafe { std::ffi::CStr::from_ptr(message) }
            .to_string_lossy()
            .into_owned()
    };
    panic!("{message}");
}

struct Bytecode {
    words: Vec<u64>,
    byte_length: usize,
}

fn compile(source: &str) -> Bytecode {
    let mut arena = vec![0_u64; ARENA_WORDS];
    let mut terminated_source = source.as_bytes().to_vec();
    terminated_source.push(0);
    let context = unsafe {
        JS_NewContext2(
            arena.as_mut_ptr().cast(),
            arena.len() * mem::size_of::<u64>(),
            stdlib(),
            1,
        )
    };
    assert!(!context.is_null());

    let program = unsafe {
        JS_Parse(
            context,
            terminated_source.as_ptr().cast(),
            source.len(),
            c"<test>".as_ptr(),
            JS_EVAL_RETVAL,
        )
    };
    assert_value(context, program);

    let mut header = BytecodeHeader {
        magic: 0,
        version: 0,
        base_addr: 0,
        unique_strings: 0,
        main_func: 0,
    };
    let mut data = ptr::null();
    let mut data_length = 0;
    unsafe {
        JS_PrepareBytecode(context, &mut header, &mut data, &mut data_length, program);
    }
    assert!(!data.is_null());
    assert_eq!(
        unsafe { JS_RelocateBytecode2(context, &mut header, data.cast_mut(), data_length, 0, 0,) },
        0
    );

    let header_bytes = unsafe {
        slice::from_raw_parts(
            ptr::addr_of!(header).cast::<u8>(),
            mem::size_of::<BytecodeHeader>(),
        )
    };
    let data_bytes = unsafe { slice::from_raw_parts(data, data_length as usize) };
    let byte_length = header_bytes.len() + data_bytes.len();
    let mut bytecode = vec![0_u64; byte_length.div_ceil(mem::size_of::<u64>())];
    let bytes = unsafe {
        slice::from_raw_parts_mut(
            bytecode.as_mut_ptr().cast::<u8>(),
            bytecode.len() * mem::size_of::<u64>(),
        )
    };
    bytes[..header_bytes.len()].copy_from_slice(header_bytes);
    bytes[header_bytes.len()..byte_length].copy_from_slice(data_bytes);
    unsafe { JS_FreeContext(context) };
    Bytecode {
        words: bytecode,
        byte_length,
    }
}

fn run_i32(mut bytecode: Bytecode) -> i32 {
    let mut arena = vec![0_u64; ARENA_WORDS];
    let context = unsafe {
        JS_NewContext(
            arena.as_mut_ptr().cast(),
            arena.len() * mem::size_of::<u64>(),
            stdlib(),
        )
    };
    assert!(!context.is_null());
    assert_eq!(
        unsafe {
            JS_RelocateBytecode(
                context,
                bytecode.words.as_mut_ptr().cast(),
                bytecode.byte_length as u32,
            )
        },
        0
    );
    let program = unsafe { JS_LoadBytecode(context, bytecode.words.as_ptr().cast()) };
    assert_value(context, program);
    let value = unsafe { JS_Run(context, program) };
    assert_value(context, value);
    let mut result = 0;
    assert_eq!(unsafe { JS_ToInt32(context, &mut result, value) }, 0);
    unsafe { JS_FreeContext(context) };
    result
}

struct ProgramCase {
    source: &'static str,
    expected: i32,
}

const PROGRAMS: &[ProgramCase] = &[
    ProgramCase {
        source: "1 + 2",
        expected: 3,
    },
    ProgramCase {
        source: "(function (value) { return value * value; })(9)",
        expected: 81,
    },
    ProgramCase {
        source: "(function () { var n = 0; for (var i = 1; i <= 5; i++) n += i; return n; })()",
        expected: 15,
    },
    ProgramCase {
        source: "(function () { var a = [2, 3, 4]; return a[0] * a[1] * a[2]; })()",
        expected: 24,
    },
];

#[test]
fn compiled_programs() {
    for case in PROGRAMS {
        assert_eq!(
            run_i32(compile(case.source)),
            case.expected,
            "{}",
            case.source
        );
    }
}

#[test]
fn c_calls_rust_string_helpers() {
    let mut buffer = *b"-----\0--";
    unsafe { test_c_pstrcpy(buffer.as_mut_ptr().cast(), 6, c"ab".as_ptr()) };
    assert_eq!(&buffer[..3], b"ab\0");

    let returned = unsafe { test_c_pstrcat(buffer.as_mut_ptr().cast(), 6, c"cdef".as_ptr()) };
    assert_eq!(returned, buffer.as_mut_ptr().cast());
    assert_eq!(&buffer[..6], b"abcde\0");

    let mut remainder = ptr::null();
    assert_eq!(
        unsafe { test_c_strstart(c"microesnext".as_ptr(), c"micro".as_ptr(), &mut remainder,) },
        1
    );
    assert_eq!(
        unsafe { std::ffi::CStr::from_ptr(remainder) }.to_bytes(),
        b"esnext"
    );
}
