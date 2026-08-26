#![no_std]

extern crate alloc;

use alloc::{string::String, vec::Vec};
use core::{cell::UnsafeCell, sync::atomic::{AtomicU32, Ordering}};

use microesnext::{Error, Machine, Outcome, Value};
use onig_sys::{
    ONIG_MISMATCH, ONIG_NORMAL, ONIG_OPTION_IGNORECASE, ONIG_OPTION_MULTILINE,
    ONIG_OPTION_NONE, ONIG_OPTION_SINGLELINE, OnigEncodingUTF8, OnigErrorInfo,
    OnigRegex, OnigSyntaxOniguruma, onig_free, onig_new, onig_region_free,
    onig_region_new, onig_search,
};

#[global_allocator]
static ALLOCATOR: dlmalloc::GlobalDlmalloc = dlmalloc::GlobalDlmalloc;

static APPLICATION: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/application.bin"));
static RESULT: AtomicU32 = AtomicU32::new(0);
static DETAIL: AtomicU32 = AtomicU32::new(0);
static STAGE: AtomicU32 = AtomicU32::new(0);
static PROGRAM_COUNTER: AtomicU32 = AtomicU32::new(0);
static FRAME: AtomicU32 = AtomicU32::new(0);
static FUNCTION: AtomicU32 = AtomicU32::new(0);
static FAILURE_KEY_LENGTH: AtomicU32 = AtomicU32::new(0);

const OBJECT: u32 = 15;
const DATE: u32 = 3;
const OBJECT_CREATE: u32 = (1 << 29) + 1;
const OBJECT_DEFINE_PROPERTY: u32 = (1 << 29) + 2;
const OBJECT_DEFINE_PROPERTIES: u32 = (1 << 29) + 3;
const REGEXP: u32 = 19;
const REGEXP_TEST: u32 = (1 << 29) + 20;
const REGEXP_EXEC: u32 = (1 << 29) + 21;
const MATH: u32 = 12;
const MATH_FUNCTION: u32 = (1 << 29) + 100;
const UINT8_ARRAY: u32 = 26;
const BRIDGE: u32 = 33;
const GLOBAL_THIS: u32 = 41;
const INSTALL_ARRAY_PROTOTYPE: u32 = 59;
const FUNCTION_CALL: u32 = (1 << 29) + 60;
const HOST_REFERENCE: u32 = 43;
const RELEASE_HOST_REFERENCE: u32 = 53;
const RELEASE_HOST_REFERENCE_LEASE: u32 = 54;
const STRING_CHAR_CODE_AT: u32 = (1 << 29) + 70;
const STRING: u32 = 22;
const STRING_FROM_CHAR_CODE: u32 = (1 << 29) + 71;
const SYMBOL: u32 = 23;
const SYMBOL_FOR: u32 = (1 << 29) + 72;
const HOST_NOW: u32 = 42;
const RUNTIME_DATE_NOW: u32 = 55;

struct WordMemory(UnsafeCell<[u32; 1_048_576]>);

// WebAssembly calls this runtime on one thread. Reentrant delivery is handled
// only after the persistent machine is installed below.
unsafe impl Sync for WordMemory {}
static WORDS: WordMemory = WordMemory(UnsafeCell::new([0; 1_048_576]));
struct KeyMemory(UnsafeCell<[u8; 32]>);
unsafe impl Sync for KeyMemory {}
static FAILURE_KEY: KeyMemory = KeyMemory(UnsafeCell::new([0; 32]));

#[link(wasm_import_module = "host")]
unsafe extern "C" {
    fn msg(offset: u32, capacity: u32) -> u32;
    #[link_name = "now"]
    fn host_now() -> f64;
}

fn report_failure(stage: u32, detail: u32) {
    let mut message = [0_u8; 128];
    message[..5].copy_from_slice(b"DULE\x03");
    let text = b"MicroESNext stopped with detail ";
    message[5..5 + text.len()].copy_from_slice(text);
    fn decimal(output: &mut [u8], mut value: u32) -> usize {
        let mut digits = [0_u8; 10];
        let mut count = 0;
        loop {
            digits[count] = b'0' + (value % 10) as u8;
            count += 1;
            value /= 10;
            if value == 0 { break; }
        }
        for index in 0..count { output[index] = digits[count - index - 1]; }
        count
    }
    let mut at = 5 + text.len();
    at += decimal(&mut message[at..], detail);
    message[at..at + 4].copy_from_slice(b" pc ");
    at += 4;
    at += decimal(&mut message[at..], PROGRAM_COUNTER.load(Ordering::Relaxed));
    message[at..at + 4].copy_from_slice(b" fn ");
    at += 4;
    at += decimal(&mut message[at..], FUNCTION.load(Ordering::Relaxed));
    let key_length = FAILURE_KEY_LENGTH.load(Ordering::Relaxed) as usize;
    if key_length > 0 && at + 5 + key_length <= message.len() {
        message[at..at + 5].copy_from_slice(b" key ");
        at += 5;
        message[at..at + key_length]
            .copy_from_slice(&unsafe { &*FAILURE_KEY.0.get() }[..key_length]);
        at += key_length;
    }
    message[4] = u8::try_from(stage.min(255)).unwrap_or(255);
    unsafe { msg(message.as_mut_ptr() as u32, u32::try_from(at + 1).unwrap()) };
}

fn remember_failure_key(machine: &Machine<'_, '_>, key: Value) {
    let Ok(bytes) = machine.string_bytes(key) else { return };
    let length = bytes.len().min(32);
    unsafe { (&mut *FAILURE_KEY.0.get())[..length].copy_from_slice(&bytes[..length]) };
    FAILURE_KEY_LENGTH.store(length as u32, Ordering::Relaxed);
}

fn object_get(machine: &mut Machine<'_, '_>, object: Value, name: &[u8]) -> Result<Value, Error> {
    let key = machine.intern_atom(name)?;
    microesnext::objects::get(machine.arena(), object, key)
}

fn object_set(
    machine: &mut Machine<'_, '_>,
    object: Value,
    name: &[u8],
    value: Value,
) -> Result<Value, Error> {
    let key = machine.intern_atom(name)?;
    microesnext::objects::set(machine.arena_mut(), object, key, value)
}

fn owned_string(machine: &Machine<'_, '_>, value: Value) -> Result<String, Error> {
    core::str::from_utf8(machine.string_bytes(value)?)
        .map(String::from)
        .map_err(|_| Error::Type)
}

fn regexp_parts(
    machine: &mut Machine<'_, '_>,
    receiver: Value,
) -> Result<(String, String, usize), Error> {
    let pattern = object_get(machine, receiver, b"source")?;
    let flags = object_get(machine, receiver, b"flags")?;
    let last_index = object_get(machine, receiver, b"lastIndex")?
        .as_i30()
        .and_then(|value| usize::try_from(value).ok())
        .unwrap_or(0);
    Ok((owned_string(machine, pattern)?, owned_string(machine, flags)?, last_index))
}

struct NativeRegex(OnigRegex);

impl Drop for NativeRegex {
    fn drop(&mut self) {
        unsafe { onig_free(self.0) };
    }
}

fn compile_regexp(pattern: &str, flags: &str) -> Result<NativeRegex, Error> {
    let mut options = ONIG_OPTION_NONE;
    if flags.contains('i') { options |= ONIG_OPTION_IGNORECASE; }
    // Oniguruma names these two options from Ruby's perspective. JavaScript's
    // `s` makes dot match a newline, while `m` changes the anchors.
    if flags.contains('s') { options |= ONIG_OPTION_MULTILINE; }
    if flags.contains('m') { options |= ONIG_OPTION_SINGLELINE; }
    let bytes = pattern.as_bytes();
    let mut regex = core::ptr::null_mut();
    let mut error = OnigErrorInfo {
        enc: core::ptr::null_mut(),
        par: core::ptr::null_mut(),
        par_end: core::ptr::null_mut(),
    };
    let status = unsafe {
        onig_new(
            &mut regex,
            bytes.as_ptr(),
            bytes.as_ptr().add(bytes.len()),
            options,
            &raw mut OnigEncodingUTF8,
            &raw mut OnigSyntaxOniguruma,
            &mut error,
        )
    };
    if status == ONIG_NORMAL as i32 && !regex.is_null() {
        Ok(NativeRegex(regex))
    } else {
        Err(Error::Type)
    }
}

fn utf16_to_byte(text: &str, index: usize) -> usize {
    let mut units = 0;
    for (byte, character) in text.char_indices() {
        if units >= index { return byte; }
        units += character.len_utf16();
    }
    text.len()
}

fn byte_to_utf16(text: &str, byte: usize) -> usize {
    text.get(..byte).unwrap_or(text).encode_utf16().count()
}

fn regexp_match(
    machine: &mut Machine<'_, '_>,
    receiver: Value,
    text: &str,
) -> Result<Option<(usize, usize, Vec<Option<core::ops::Range<usize>>>)>, Error> {
    let (pattern, flags, last_index) = regexp_parts(machine, receiver)?;
    let regexp = compile_regexp(&pattern, &flags)?;
    let start_units = if flags.contains('g') || flags.contains('y') { last_index } else { 0 };
    let start = utf16_to_byte(text, start_units);
    let bytes = text.as_bytes();
    let region = unsafe { onig_region_new() };
    if region.is_null() { return Err(Error::OutOfMemory); }
    let status = unsafe {
        onig_search(
            regexp.0,
            bytes.as_ptr(),
            bytes.as_ptr().add(bytes.len()),
            bytes.as_ptr().add(start),
            bytes.as_ptr().add(bytes.len()),
            region,
            ONIG_OPTION_NONE,
        )
    };
    if status == ONIG_MISMATCH || status < 0 {
        unsafe { onig_region_free(region, 1) };
        if flags.contains('g') || flags.contains('y') {
            let zero = Value::from_i30(0).ok_or(Error::Type)?;
            object_set(machine, receiver, b"lastIndex", zero)?;
        }
        return Ok(None);
    }
    let native = unsafe { &*region };
    if native.num_regs <= 0 {
        unsafe { onig_region_free(region, 1) };
        return Ok(None);
    }
    let begins = unsafe { core::slice::from_raw_parts(native.beg, native.num_regs as usize) };
    let ends = unsafe { core::slice::from_raw_parts(native.end, native.num_regs as usize) };
    let begin = byte_to_utf16(text, begins[0] as usize);
    let end = byte_to_utf16(text, ends[0] as usize);
    if flags.contains('y') && begin != start_units {
        unsafe { onig_region_free(region, 1) };
        return Ok(None);
    }
    let groups = begins.iter().zip(ends).map(|(&begin, &end)| {
        (begin >= 0 && end >= 0).then(|| {
            byte_to_utf16(text, begin as usize)..byte_to_utf16(text, end as usize)
        })
    }).collect();
    unsafe { onig_region_free(region, 1) };
    if flags.contains('g') || flags.contains('y') {
        let next = Value::from_i30(i32::try_from(end).map_err(|_| Error::Type)?)
            .ok_or(Error::Type)?;
        object_set(machine, receiver, b"lastIndex", next)?;
    }
    Ok(Some((begin, end, groups)))
}

#[unsafe(no_mangle)]
pub extern "C" fn onmsg(minimum_length: u32) {
    if minimum_length != 0 || RESULT.load(Ordering::Relaxed) != 0 {
        return;
    }
    let words = unsafe { &mut *WORDS.0.get() };
    let mut machine = match Machine::with_atoms(APPLICATION, words, 16) {
        Ok(machine) => machine,
        Err(error) => {
            DETAIL.store(error as u32 + 400, Ordering::Relaxed);
            return;
        }
    };
    machine.install_function_call(microesnext::HostRef::new(FUNCTION_CALL).unwrap());
    machine.install_host_object_types(
        (1_u64 << 9) | (1_u64 << 12) | (1_u64 << 37) | (1_u64 << 38)
            | (1_u64 << 41) | (1_u64 << 45) | (1_u64 << 48) | (1_u64 << 49)
            | (1_u64 << 58),
    );
    let string_prototype = (|| {
        let prototype = machine.new_object(Value::NULL)?;
        object_set(
            &mut machine,
            prototype,
            b"charCodeAt",
            Value::from_host(microesnext::HostRef::new(STRING_CHAR_CODE_AT).unwrap()),
        )
    })();
    let string_prototype = match string_prototype.and_then(|value| {
        machine.install_string_prototype(value)?;
        machine.retain(value)
    }) {
        Ok(value) => value,
        Err(error) => {
            DETAIL.store(error as u32 + 1300, Ordering::Relaxed);
            return;
        }
    };
    let machine_string_prototype = string_prototype;
    let date_prototype = match machine
        .new_object(Value::NULL)
        .and_then(|value| machine.retain(value))
    {
        Ok(root) => root,
        Err(error) => {
            DETAIL.store(error as u32 + 1600, Ordering::Relaxed);
            return;
        }
    };
    let global_overlay = match machine.new_object(Value::NULL)
        .and_then(|value| machine.retain(value))
    {
        Ok(root) => root,
        Err(error) => {
            DETAIL.store(error as u32 + 1400, Ordering::Relaxed);
            return;
        }
    };
    let raw = loop {
        STAGE.fetch_add(1, Ordering::Relaxed);
        FAILURE_KEY_LENGTH.store(0, Ordering::Relaxed);
        match machine.run() {
            Ok(Outcome::Complete(value)) | Ok(Outcome::Throw(value)) => break value.raw(),
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == OBJECT && machine.string_bytes(key) == Ok(b"create") =>
            {
                machine.complete_host_operation(microesnext::Value::from_host(
                    microesnext::HostRef::new(OBJECT_CREATE).unwrap(),
                )).unwrap();
            }
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == GLOBAL_THIS && machine.string_bytes(key) == Ok(b"bridge") =>
            {
                machine.complete_host_operation(microesnext::Value::from_host(
                    microesnext::HostRef::new(BRIDGE).unwrap(),
                )).unwrap();
            }
            Ok(Outcome::HostGet { object, key, .. }) if object.index() == GLOBAL_THIS => {
                let result = machine.root(global_overlay)
                    .and_then(|overlay| microesnext::objects::get(machine.arena(), overlay, key));
                match result.and_then(|value| machine.complete_host_operation(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 1400, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == STRING && machine.string_bytes(key) == Ok(b"fromCharCode") =>
            {
                machine.complete_host_operation(Value::from_host(
                    microesnext::HostRef::new(STRING_FROM_CHAR_CODE).unwrap(),
                )).unwrap();
            }
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == STRING && machine.string_bytes(key) == Ok(b"prototype") =>
            {
                match machine.root(machine_string_prototype).and_then(|value| {
                    machine.complete_host_operation(value)
                }) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 1300, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == DATE && machine.string_bytes(key) == Ok(b"prototype") =>
            {
                match machine
                    .root(date_prototype)
                    .and_then(|value| machine.complete_host_operation(value))
                {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 1600, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostGet { object, key, .. }) if object.index() == SYMBOL => {
                let result = match machine.string_bytes(key) {
                    Ok(b"hasInstance") => machine.intern_atom(b"@@hasInstance"),
                    Ok(b"iterator") => machine.intern_atom(b"@@iterator"),
                    Ok(b"for") => Ok(Value::from_host(
                        microesnext::HostRef::new(SYMBOL_FOR).unwrap(),
                    )),
                    _ => Err(Error::Type),
                };
                match result.and_then(|value| machine.complete_host_operation(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 1500, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostGet { object, key, .. }) if object.index() == MATH => {
                let operation = match machine.string_bytes(key) {
                    Ok(b"abs") => 0,
                    Ok(b"ceil") => 1,
                    Ok(b"floor") => 2,
                    Ok(b"max") => 3,
                    Ok(b"min") => 4,
                    Ok(b"random") => 5,
                    Ok(b"round") => 6,
                    _ => {
                        DETAIL.store(MATH, Ordering::Relaxed);
                        break u32::MAX - 2;
                    }
                };
                machine.complete_host_operation(microesnext::Value::from_host(
                    microesnext::HostRef::new(MATH_FUNCTION + operation).unwrap(),
                )).unwrap();
            }
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == OBJECT
                    && machine.string_bytes(key) == Ok(b"defineProperty") =>
            {
                machine.complete_host_operation(microesnext::Value::from_host(
                    microesnext::HostRef::new(OBJECT_DEFINE_PROPERTY).unwrap(),
                )).unwrap();
            }
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == OBJECT
                    && machine.string_bytes(key) == Ok(b"defineProperties") =>
            {
                machine.complete_host_operation(Value::from_host(
                    microesnext::HostRef::new(OBJECT_DEFINE_PROPERTIES).unwrap(),
                )).unwrap();
            }
            Ok(Outcome::HostCall { function, .. }) if function.index() == OBJECT_CREATE => {
                let object = match machine.new_object(microesnext::Value::NULL) {
                    Ok(value) => value,
                    Err(error) => {
                        DETAIL.store(error as u32 + 100, Ordering::Relaxed);
                        break u32::MAX;
                    }
                };
                if let Err(error) = machine.complete_host_call(object) {
                    DETAIL.store(error as u32 + 200, Ordering::Relaxed);
                    break u32::MAX;
                }
            }
            Ok(Outcome::HostCall { function, .. })
                if function.index() == OBJECT_DEFINE_PROPERTY =>
            {
                let result = machine.host_argument(0)
                    .and_then(|object| Ok((object, machine.host_argument(1)?, machine.host_argument(2)?)))
                    .and_then(|(object, key, descriptor)| {
                        if object.as_host().is_some_and(|host| host.index() == GLOBAL_THIS) {
                            let overlay = machine.root(global_overlay)?;
                            machine.define_property(overlay, key, descriptor)?;
                            Ok(object)
                        } else {
                            machine.define_property(object, key, descriptor)
                        }
                    });
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 600, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, .. })
                if function.index() == OBJECT_DEFINE_PROPERTIES =>
            {
                let result = (|| {
                    let descriptors = machine.host_argument(1).map_err(|_| 1_u32)?;
                    let count = microesnext::objects::own_property_count(machine.arena(), descriptors)
                        .map_err(|_| 2_u32)?;
                    for index in 0..count {
                        let descriptors = machine.host_argument(1).map_err(|_| 3_u32)?;
                        let key = microesnext::objects::own_property_key(machine.arena(), descriptors, index)
                            .map_err(|_| 4_u32)?;
                        let descriptor = microesnext::objects::get(machine.arena(), descriptors, key)
                            .map_err(|_| 5_u32)?;
                        let object = machine.host_argument(0).map_err(|_| 6_u32)?;
                        machine.define_property(object, key, descriptor).map_err(|_| 7_u32)?;
                    }
                    machine.host_argument(0).map_err(|_| 8_u32)
                })();
                if let Err(step) = result {
                    DETAIL.store(1600 + step, Ordering::Relaxed);
                    break u32::MAX;
                }
                let result: Result<Value, Error> = Ok(result.unwrap());
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 600, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, argument_count, .. })
                if function.index() >= MATH_FUNCTION && function.index() <= MATH_FUNCTION + 6 =>
            {
                let operation = function.index() - MATH_FUNCTION;
                let first = machine.host_argument(0).ok().and_then(|value| machine.number(value).ok())
                    .unwrap_or(0.0);
                let number = match operation {
                    0 => first.abs(),
                    1 => libm::ceil(first),
                    2 => libm::floor(first),
                    3 | 4 => {
                        let mut result = first;
                        for index in 1..argument_count {
                            let next = machine.host_argument(index).and_then(|value| machine.number(value))
                                .unwrap_or(f64::NAN);
                            result = if operation == 3 { result.max(next) } else { result.min(next) };
                        }
                        result
                    }
                    5 => 0.5,
                    6 => libm::floor(first + 0.5),
                    _ => unreachable!(),
                };
                match machine.new_number(number).and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 700, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, .. }) if function.index() == INSTALL_ARRAY_PROTOTYPE => {
                let prototype = match machine.host_argument(0) {
                    Ok(value) => value,
                    Err(error) => {
                        DETAIL.store(error as u32 + 500, Ordering::Relaxed);
                        break u32::MAX;
                    }
                };
                let key = machine.intern_atom(b"forEach").unwrap();
                if microesnext::objects::get(machine.arena(), prototype, key).is_err() {
                    DETAIL.store(prototype.raw(), Ordering::Relaxed);
                    break u32::MAX;
                }
                if let Err(error) = machine.install_array_prototype(prototype)
                    .and_then(|()| machine.complete_host_call(microesnext::Value::UNDEFINED))
                {
                    DETAIL.store(error as u32 + 500, Ordering::Relaxed);
                    break u32::MAX;
                }
            }
            Ok(Outcome::HostCall { function, .. }) if function.index() == BRIDGE => {
                let bytes = match machine.host_argument(0) {
                    Ok(value) => value,
                    Err(error) => {
                        DETAIL.store(error as u32 + 800, Ordering::Relaxed);
                        break u32::MAX;
                    }
                };
                let capacity = match machine.host_argument(1)
                    .and_then(|value| value.as_i30().ok_or(microesnext::Error::Type))
                    .and_then(|value| u32::try_from(value).map_err(|_| microesnext::Error::Type))
                {
                    Ok(value) => value,
                    Err(error) => {
                        DETAIL.store(error as u32 + 800, Ordering::Relaxed);
                        break u32::MAX;
                    }
                };
                let result = {
                    let buffer = match machine.bytes_mut(bytes) {
                        Ok(buffer) => buffer,
                        Err(error) => {
                            DETAIL.store(error as u32 + 800, Ordering::Relaxed);
                            break u32::MAX;
                        }
                    };
                    unsafe { msg(buffer.as_mut_ptr() as u32, capacity) }
                };
                let Some(result) = i32::try_from(result).ok().and_then(microesnext::Value::from_i30) else {
                    DETAIL.store(result, Ordering::Relaxed);
                    break u32::MAX;
                };
                if let Err(error) = machine.complete_host_call(result) {
                    DETAIL.store(error as u32 + 800, Ordering::Relaxed);
                    break u32::MAX;
                }
            }
            Ok(Outcome::HostCall { function, .. }) if function.index() == FUNCTION_CALL => {
                if let Err(error) = machine.complete_function_call() {
                    DETAIL.store(error as u32 + 1000, Ordering::Relaxed);
                    break u32::MAX;
                }
            }
            Ok(Outcome::HostCall { function, .. }) if function.index() == HOST_REFERENCE => {
                let reference = machine.host_argument(0).unwrap_or(Value::UNDEFINED);
                if let Err(error) = machine.complete_host_call(reference) {
                    DETAIL.store(error as u32 + 1100, Ordering::Relaxed);
                    break u32::MAX;
                }
            }
            Ok(Outcome::HostCall { function, receiver, .. })
                if function.index() == STRING_CHAR_CODE_AT =>
            {
                let result = (|| {
                    let text = owned_string(&machine, receiver.ok_or(Error::Type)?)?;
                    let index = machine.host_argument(0)?.as_i30().ok_or(Error::Type)?;
                    let code = usize::try_from(index).ok()
                        .and_then(|index| text.encode_utf16().nth(index))
                        .map(i32::from)
                        .unwrap_or(0);
                    Value::from_i30(code).ok_or(Error::Type)
                })();
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 1300, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, argument_count, .. })
                if function.index() == STRING_FROM_CHAR_CODE =>
            {
                let mut text = String::new();
                let result = (|| {
                    for index in 0..argument_count {
                        let code = machine.host_argument(index)?.as_i30().ok_or(Error::Type)? as u16;
                        text.push(char::from_u32(u32::from(code)).unwrap_or(char::REPLACEMENT_CHARACTER));
                    }
                    machine.new_string(text.as_bytes())
                })();
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 1300, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, .. }) if function.index() == SYMBOL_FOR => {
                let result = machine.host_argument(0).and_then(|value| {
                    let mut name = String::from("@@for:");
                    name.push_str(core::str::from_utf8(machine.string_bytes(value)?).map_err(|_| Error::Type)?);
                    machine.intern_atom(name.as_bytes())
                });
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 1500, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, .. })
                if function.index() == HOST_NOW || function.index() == RUNTIME_DATE_NOW =>
            {
                let result = machine.new_number(unsafe { host_now() });
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 1700, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, .. })
                if function.index() == RELEASE_HOST_REFERENCE
                    || function.index() == RELEASE_HOST_REFERENCE_LEASE =>
            {
                if let Err(error) = machine.complete_host_call(Value::UNDEFINED) {
                    DETAIL.store(error as u32 + 1100, Ordering::Relaxed);
                    break u32::MAX;
                }
            }
            Ok(Outcome::HostCall { function, receiver, .. })
                if function.index() == REGEXP_TEST || function.index() == REGEXP_EXEC =>
            {
                let result = (|| {
                    let receiver = receiver.ok_or(Error::Type)?;
                    let text = owned_string(&machine, machine.host_argument(0)?)?;
                    let found = regexp_match(&mut machine, receiver, &text)?;
                    if function.index() == REGEXP_TEST {
                        return Ok(if found.is_some() { Value::TRUE } else { Value::FALSE });
                    }
                    let Some((begin, _end, groups)) = found else {
                        return Ok(Value::NULL);
                    };
                    let mut result = microesnext::objects::arrays::new(machine.arena_mut())?;
                    for (index, group) in groups.into_iter().enumerate() {
                        let value = if let Some(range) = group {
                            machine.new_string(&text.as_bytes()[range])?
                        } else {
                            Value::UNDEFINED
                        };
                        result = microesnext::objects::arrays::set(
                            machine.arena_mut(), result, index, value,
                        )?;
                    }
                    let index = Value::from_i30(i32::try_from(begin).map_err(|_| Error::Type)?)
                        .ok_or(Error::Type)?;
                    result = object_set(&mut machine, result, b"index", index)?;
                    let input = machine.new_string(text.as_bytes())?;
                    object_set(&mut machine, result, b"input", input)
                })();
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 900, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, .. }) => {
                DETAIL.store(function.index(), Ordering::Relaxed);
                break u32::MAX - 1;
            }
            Ok(Outcome::HostConstruct { constructor, .. }) => {
                if constructor.index() == UINT8_ARRAY {
                    let length = machine.host_argument(0).ok().and_then(|value| value.as_i30())
                        .and_then(|value| usize::try_from(value).ok());
                    let Some(length) = length else {
                        DETAIL.store(300, Ordering::Relaxed);
                        break u32::MAX;
                    };
                    match machine.new_bytes(length).and_then(|bytes| {
                        machine.complete_host_construct(bytes)?;
                        Ok(())
                    }) {
                        Ok(()) => continue,
                        Err(error) => {
                            DETAIL.store(error as u32 + 300, Ordering::Relaxed);
                            break u32::MAX;
                        }
                    }
                }
                if constructor.index() == REGEXP {
                    let result = (|| {
                        let pattern = machine.host_argument(0)?;
                        let flags = machine.host_argument(1).unwrap_or(Value::UNDEFINED);
                        let pattern_text = owned_string(&machine, pattern)?;
                        let flags_text = if flags == Value::UNDEFINED {
                            String::new()
                        } else {
                            owned_string(&machine, flags)?
                        };
                        compile_regexp(&pattern_text, &flags_text)?;
                        let mut object = machine.new_object(Value::NULL)?;
                        object = object_set(&mut machine, object, b"source", pattern)?;
                        let flags = machine.new_string(flags_text.as_bytes())?;
                        object = object_set(&mut machine, object, b"flags", flags)?;
                        object = object_set(
                            &mut machine,
                            object,
                            b"lastIndex",
                            Value::from_i30(0).ok_or(Error::Type)?,
                        )?;
                        object = object_set(
                            &mut machine,
                            object,
                            b"test",
                            Value::from_host(microesnext::HostRef::new(REGEXP_TEST).unwrap()),
                        )?;
                        object_set(
                            &mut machine,
                            object,
                            b"exec",
                            Value::from_host(microesnext::HostRef::new(REGEXP_EXEC).unwrap()),
                        )
                    })();
                    match result.and_then(|object| machine.complete_host_construct(object)) {
                        Ok(()) => continue,
                        Err(error) => {
                            DETAIL.store(error as u32 + 900, Ordering::Relaxed);
                            break u32::MAX;
                        }
                    }
                }
                DETAIL.store(constructor.index(), Ordering::Relaxed);
                break u32::MAX - 5;
            }
            Ok(Outcome::HostGet { object, key, .. }) => {
                remember_failure_key(&machine, key);
                DETAIL.store(object.index(), Ordering::Relaxed);
                break u32::MAX - 2;
            }
            Ok(Outcome::HostSet { object, key, value }) if object.index() == GLOBAL_THIS => {
                let result = machine.root(global_overlay)
                    .and_then(|overlay| microesnext::objects::set(machine.arena_mut(), overlay, key, value))
                    .map(|_| ());
                if let Err(error) = result.and_then(|()| machine.complete_host_operation(Value::UNDEFINED)) {
                    DETAIL.store(error as u32 + 1200, Ordering::Relaxed);
                    break u32::MAX;
                }
            }
            Ok(Outcome::HostSet { object, .. }) => {
                DETAIL.store(object.index(), Ordering::Relaxed);
                break u32::MAX - 4;
            }
            Err(error) => {
                DETAIL.store(error as u32 + 1, Ordering::Relaxed);
                PROGRAM_COUNTER.store(machine.program_counter() as u32, Ordering::Relaxed);
                FRAME.store(machine.frame_header().map_or(u32::MAX, |value| value.raw()), Ordering::Relaxed);
                FUNCTION.store(machine.current_function_entry().map_or(u32::MAX, |value| value as u32), Ordering::Relaxed);
                break u32::MAX;
            }
            _ => break u32::MAX,
        }
    };
    if raw >= u32::MAX - 10 {
        report_failure(STAGE.load(Ordering::Relaxed), DETAIL.load(Ordering::Relaxed));
    }
    RESULT.store(raw, Ordering::Relaxed);
}

#[unsafe(no_mangle)]
pub extern "C" fn result() -> u32 {
    RESULT.load(Ordering::Relaxed)
}

#[unsafe(no_mangle)]
pub extern "C" fn detail() -> u32 {
    DETAIL.load(Ordering::Relaxed)
}

#[unsafe(no_mangle)]
pub extern "C" fn stage() -> u32 {
    STAGE.load(Ordering::Relaxed)
}

#[unsafe(no_mangle)]
pub extern "C" fn program_counter() -> u32 {
    PROGRAM_COUNTER.load(Ordering::Relaxed)
}

#[unsafe(no_mangle)]
pub extern "C" fn frame() -> u32 {
    FRAME.load(Ordering::Relaxed)
}

#[unsafe(no_mangle)]
pub extern "C" fn function() -> u32 {
    FUNCTION.load(Ordering::Relaxed)
}

#[cfg(all(not(test), target_os = "unknown"))]
#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    core::arch::wasm32::unreachable()
}

#[cfg(test)]
mod tests {
    use super::compile_regexp;

    #[test]
    fn embedded_regexp_accepts_codemirror_unicode_word_characters() {
        assert!(compile_regexp(r"[\p{Alphabetic}\p{Number}_]", "u").is_ok());
    }
}
