#![no_std]

extern crate alloc;

use alloc::{string::{String, ToString}, vec, vec::Vec};
use core::{cell::UnsafeCell, sync::atomic::{AtomicU32, Ordering}};

use microesnext::{Error, Machine, Outcome, Value};

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
static SYMBOL_SEQUENCE: AtomicU32 = AtomicU32::new(0);

const OBJECT: u32 = 15;
const ARRAY: u32 = 0;
const PROXY: u32 = 17;
const ERROR: u32 = 4;
const RANGE_ERROR: u32 = 18;
const SYNTAX_ERROR: u32 = 24;
const TYPE_ERROR: u32 = 25;
const DATE: u32 = 3;
const INTL: u32 = 7;
const PROCESS: u32 = 49;
const OBJECT_CREATE: u32 = (1 << 29) + 1;
const OBJECT_DEFINE_PROPERTY: u32 = (1 << 29) + 2;
const OBJECT_DEFINE_PROPERTIES: u32 = (1 << 29) + 3;
const OBJECT_KEYS: u32 = (1 << 29) + 4;
const OBJECT_HAS_OWN_PROPERTY: u32 = (1 << 29) + 5;
const OBJECT_ASSIGN: u32 = (1 << 29) + 6;
const REGEXP: u32 = 19;
const REGEXP_TEST: u32 = (1 << 29) + 20;
const REGEXP_EXEC: u32 = (1 << 29) + 21;
const MATH: u32 = 12;
const MATH_FUNCTION: u32 = (1 << 29) + 100;
const ARRAY_IS_ARRAY: u32 = (1 << 29) + 200;
const UINT8_ARRAY: u32 = 26;
const UINT16_ARRAY: u32 = 27;
const UINT32_ARRAY: u32 = 28;
const BRIDGE: u32 = 33;
const GLOBAL_THIS: u32 = 41;
const INSTALL_ARRAY_PROTOTYPE: u32 = 59;
const FUNCTION_CALL: u32 = (1 << 29) + 60;
const HOST_REFERENCE: u32 = 43;
const RELEASE_HOST_REFERENCE: u32 = 53;
const RELEASE_HOST_REFERENCE_LEASE: u32 = 54;
const STRING_CHAR_CODE_AT: u32 = (1 << 29) + 70;
const STRING_SPLIT: u32 = (1 << 29) + 74;
const STRING: u32 = 22;
const STRING_FROM_CHAR_CODE: u32 = (1 << 29) + 71;
const WEAK_REF: u32 = 30;
const WEAK_REF_DEREF: u32 = (1 << 29) + 73;
const SYMBOL: u32 = 23;
const SYMBOL_FOR: u32 = (1 << 29) + 72;
const HOST_NOW: u32 = 42;
const RUNTIME_DATE_NOW: u32 = 55;
const PARSE_FLOAT: u32 = 46;
const PARSE_INT: u32 = 47;
const NUMBER_TO_STRING: u32 = (1 << 29) + 75;
const STRING_REPLACE: u32 = (1 << 29) + 76;
const STRING_TO_LOWER_CASE: u32 = (1 << 29) + 77;
const STRING_SLICE: u32 = (1 << 29) + 78;

struct WordMemory(UnsafeCell<[u32; 4_194_304]>);

// WebAssembly calls this runtime on one thread. Reentrant delivery is handled
// only after the persistent machine is installed below.
unsafe impl Sync for WordMemory {}
static WORDS: WordMemory = WordMemory(UnsafeCell::new([0; 4_194_304]));
struct KeyMemory(UnsafeCell<[u8; 96]>);
unsafe impl Sync for KeyMemory {}
static FAILURE_KEY: KeyMemory = KeyMemory(UnsafeCell::new([0; 96]));

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
    if key_length > 0 && at + 5 < message.len() {
        message[at..at + 5].copy_from_slice(b" key ");
        at += 5;
        let shown = key_length.min(message.len() - at);
        message[at..at + shown]
            .copy_from_slice(&unsafe { &*FAILURE_KEY.0.get() }[..shown]);
        at += shown;
    }
    message[4] = u8::try_from(stage.min(255)).unwrap_or(255);
    unsafe { msg(message.as_mut_ptr() as u32, u32::try_from(at + 1).unwrap()) };
}

fn remember_failure_key(machine: &Machine<'_, '_>, key: Value) {
    let Ok(bytes) = machine.string_bytes(key) else { return };
    remember_failure_bytes(bytes);
}

fn remember_failure_bytes(bytes: &[u8]) {
    let length = bytes.len().min(96);
    unsafe { (&mut *FAILURE_KEY.0.get())[..length].copy_from_slice(&bytes[..length]) };
    FAILURE_KEY_LENGTH.store(length as u32, Ordering::Relaxed);
}

fn object_get(machine: &mut Machine<'_, '_>, object: Value, name: &[u8]) -> Result<Value, Error> {
    let object = machine.retain(object)?;
    let key = machine.intern_atom(name)?;
    let value = microesnext::objects::get(machine.arena(), machine.root(object)?, key)?;
    machine.release(object)?;
    Ok(value)
}

fn object_set(
    machine: &mut Machine<'_, '_>,
    object: Value,
    name: &[u8],
    value: Value,
) -> Result<Value, Error> {
    let object = machine.retain(object)?;
    let value = machine.retain(value)?;
    let key = machine.intern_atom(name)?;
    let object_value = machine.root(object)?;
    let value_value = machine.root(value)?;
    let object_value = microesnext::objects::set(
        machine.arena_mut(), object_value, key, value_value,
    )?;
    machine.release(value)?;
    machine.release(object)?;
    Ok(object_value)
}

fn object_set_key(
    machine: &mut Machine<'_, '_>, object: Value, key: Value, value: Value,
) -> Result<Value, Error> {
    let object = machine.retain(object)?;
    let value = machine.retain(value)?;
    let object_value = machine.root(object)?;
    let value_value = machine.root(value)?;
    let updated = microesnext::objects::set(
        machine.arena_mut(), object_value, key, value_value,
    )?;
    machine.release(value)?;
    machine.release(object)?;
    Ok(updated)
}

fn owned_string(machine: &Machine<'_, '_>, value: Value) -> Result<String, Error> {
    core::str::from_utf8(machine.string_bytes(value)?)
        .map(String::from)
        .map_err(|_| Error::Type)
}

fn owned_primitive_string(machine: &mut Machine<'_, '_>, value: Value) -> Result<String, Error> {
    if let Ok(string) = owned_string(machine, value) {
        return Ok(string);
    }
    if let Ok(Some(number)) = microesnext::numbers::try_get(machine.arena(), value) {
        use core::fmt::Write;
        let mut string = String::new();
        write!(&mut string, "{number}").map_err(|_| Error::Type)?;
        return Ok(string);
    }
    let string = microesnext::strings::from_primitive(machine.arena_mut(), value)?;
    owned_string(machine, string)
}

fn regexp_parts(
    machine: &mut Machine<'_, '_>,
    receiver: Value,
) -> Result<(String, String, usize), Error> {
    remember_failure_bytes(b"regexp-source");
    let pattern = object_get(machine, receiver, b"source")?;
    let pattern = owned_string(machine, pattern)?;
    remember_failure_bytes(b"regexp-flags");
    let flags = object_get(machine, receiver, b"flags")?;
    let flags = owned_string(machine, flags)?;
    remember_failure_bytes(b"regexp-last-index");
    let last_index = object_get(machine, receiver, b"lastIndex")?
        .as_i30()
        .and_then(|value| usize::try_from(value).ok())
        .unwrap_or(0);
    Ok((pattern, flags, last_index))
}

// The old Oniguruma experiment remains unreachable only until the direct
// MicroQuickJS-to-Rust port is wired in. Keeping these failure points explicit
// prevents a build from silently regaining Emscripten or libc.
struct NativeRegex;

fn compile_regexp(_: &str, _: &str) -> Result<NativeRegex, Error> {
    Err(Error::Type)
}

fn regexp_match(
    _: &mut Machine<'_, '_>,
    _: Value,
    _: &str,
) -> Result<Option<(usize, usize, Vec<Option<core::ops::Range<usize>>>)>, Error> {
    Err(Error::Type)
}

fn regexp_split(
    _: &mut Machine<'_, '_>,
    _: Value,
    _: &str,
) -> Result<Vec<String>, Error> {
    Err(Error::Type)
}

fn regexp_replace(
    _: &mut Machine<'_, '_>,
    _: Value,
    _: &str,
    _: &str,
) -> Result<String, Error> {
    Err(Error::Type)
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
    let object_prototype = (|| {
        let prototype = machine.new_object(Value::NULL)?;
        let prototype = object_set(
            &mut machine,
            prototype,
            b"hasOwnProperty",
            Value::from_host(microesnext::HostRef::new(OBJECT_HAS_OWN_PROPERTY).unwrap()),
        )?;
        machine.install_object_prototype(prototype)?;
        machine.retain(prototype)
    })();
    let object_prototype = match object_prototype {
        Ok(root) => root,
        Err(error) => {
            DETAIL.store(error as u32 + 2400, Ordering::Relaxed);
            return;
        }
    };
    let string_prototype = (|| {
        let prototype = machine.new_object(machine.root(object_prototype)?)?;
        object_set(
            &mut machine,
            prototype,
            b"charCodeAt",
            Value::from_host(microesnext::HostRef::new(STRING_CHAR_CODE_AT).unwrap()),
        )
        .and_then(|prototype| object_set(
            &mut machine,
            prototype,
            b"split",
            Value::from_host(microesnext::HostRef::new(STRING_SPLIT).unwrap()),
        ))
        .and_then(|prototype| object_set(
            &mut machine,
            prototype,
            b"replace",
            Value::from_host(microesnext::HostRef::new(STRING_REPLACE).unwrap()),
        ))
        .and_then(|prototype| object_set(
            &mut machine,
            prototype,
            b"toLowerCase",
            Value::from_host(microesnext::HostRef::new(STRING_TO_LOWER_CASE).unwrap()),
        ))
        .and_then(|prototype| object_set(
            &mut machine,
            prototype,
            b"slice",
            Value::from_host(microesnext::HostRef::new(STRING_SLICE).unwrap()),
        ))
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
    let number_prototype = (|| {
        let base = machine.root(object_prototype)?;
        let prototype = machine.new_object(base)?;
        object_set(
            &mut machine,
            prototype,
            b"toString",
            Value::from_host(microesnext::HostRef::new(NUMBER_TO_STRING).unwrap()),
        )
    })();
    if let Err(error) = number_prototype.and_then(|value| machine.install_number_prototype(value)) {
        DETAIL.store(error as u32 + 2500, Ordering::Relaxed);
        return;
    }
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
            Ok(Outcome::Complete(value)) => break value.raw(),
            Ok(Outcome::Throw(value)) => {
                if let Ok(message) = object_get(&mut machine, value, b"message") {
                    if let Ok(bytes) = machine.string_bytes(message) {
                        remember_failure_bytes(bytes);
                    }
                }
                DETAIL.store(3000, Ordering::Relaxed);
                break u32::MAX;
            }
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == ARRAY && machine.string_bytes(key) == Ok(b"isArray") =>
            {
                machine.complete_host_operation(Value::from_host(
                    microesnext::HostRef::new(ARRAY_IS_ARRAY).unwrap(),
                )).unwrap();
            }
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == INTL && machine.string_bytes(key) == Ok(b"Segmenter") =>
            {
                // CodeMirror feature-detects Segmenter and has its own Unicode
                // word-boundary fallback when a runtime does not provide it.
                machine.complete_host_operation(Value::UNDEFINED).unwrap();
            }
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == PROCESS && machine.string_bytes(key) == Ok(b"env") =>
            {
                machine.complete_host_operation(Value::UNDEFINED).unwrap();
            }
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == OBJECT && machine.string_bytes(key) == Ok(b"create") =>
            {
                machine.complete_host_operation(microesnext::Value::from_host(
                    microesnext::HostRef::new(OBJECT_CREATE).unwrap(),
                )).unwrap();
            }
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == OBJECT && machine.string_bytes(key) == Ok(b"prototype") =>
            {
                match machine.root(object_prototype)
                    .and_then(|value| machine.complete_host_operation(value))
                {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 2400, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == GLOBAL_THIS && machine.string_bytes(key) == Ok(b"bridge") =>
            {
                machine.complete_host_operation(microesnext::Value::from_host(
                    microesnext::HostRef::new(BRIDGE).unwrap(),
                )).unwrap();
            }
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == GLOBAL_THIS
                    && machine.string_bytes(key) == Ok(b"__wwcStringReplace") =>
            {
                machine.complete_host_operation(Value::from_host(
                    microesnext::HostRef::new(STRING_REPLACE).unwrap(),
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
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == OBJECT && machine.string_bytes(key) == Ok(b"keys") =>
            {
                machine.complete_host_operation(Value::from_host(
                    microesnext::HostRef::new(OBJECT_KEYS).unwrap(),
                )).unwrap();
            }
            Ok(Outcome::HostGet { object, key, .. })
                if object.index() == OBJECT && machine.string_bytes(key) == Ok(b"assign") =>
            {
                machine.complete_host_operation(Value::from_host(
                    microesnext::HostRef::new(OBJECT_ASSIGN).unwrap(),
                )).unwrap();
            }
            Ok(Outcome::HostCall { function, .. }) if function.index() == OBJECT_CREATE => {
                let object = match machine
                    .host_argument(0)
                    .or(Ok(Value::NULL))
                    .and_then(|prototype| machine.retain(prototype))
                    .and_then(|root| {
                        let prototype = machine.root(root)?;
                        let object = machine.new_object(prototype);
                        machine.release(root)?;
                        object
                    })
                {
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
            Ok(Outcome::HostCall { function, .. }) if function.index() == ARRAY_IS_ARRAY => {
                let result = machine.host_argument(0)
                    .map(|value| if microesnext::objects::arrays::is_array(machine.arena(), value) {
                        Value::TRUE
                    } else {
                        Value::FALSE
                    });
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 3200, Ordering::Relaxed);
                        break u32::MAX;
                    }
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
            Ok(Outcome::HostCall { function, .. }) if function.index() == OBJECT_KEYS => {
                let result = (|| {
                    let object = machine.host_argument(0)?;
                    let object_root = machine.retain(object)?;
                    let count = microesnext::objects::own_property_count(
                        machine.arena(),
                        machine.root(object_root)?,
                    )?;
                    let mut keys = microesnext::arrays::new(machine.arena_mut())?;
                    for index in 0..count {
                        let object = machine.root(object_root)?;
                        let key = microesnext::objects::own_property_key(
                            machine.arena(), object, index,
                        )?;
                        keys = microesnext::arrays::set(machine.arena_mut(), keys, index, key)?;
                    }
                    machine.release(object_root)?;
                    Ok(keys)
                })();
                match result.and_then(|keys| machine.complete_host_call(keys)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 1900, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, argument_count, .. })
                if function.index() == OBJECT_ASSIGN =>
            {
                let result = (|| {
                    for source_index in 1..argument_count {
                        let source = machine.host_argument(source_index)?;
                        if source == Value::NULL || source == Value::UNDEFINED { continue; }
                        let count = microesnext::objects::own_property_count(machine.arena(), source)?;
                        for property_index in 0..count {
                            let source = machine.host_argument(source_index)?;
                            let key = microesnext::objects::own_property_key(
                                machine.arena(), source, property_index,
                            )?;
                            let value = microesnext::objects::get(machine.arena(), source, key)?;
                            let target = machine.host_argument(0)?;
                            microesnext::objects::set(machine.arena_mut(), target, key, value)?;
                        }
                    }
                    machine.host_argument(0)
                })();
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 3300, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, receiver, .. })
                if function.index() == OBJECT_HAS_OWN_PROPERTY =>
            {
                remember_failure_bytes(b"has-own-receiver");
                let result = (|| {
                    let object = machine.retain(receiver.ok_or(Error::Type)?)?;
                    remember_failure_bytes(b"has-own-key");
                    let argument = machine.host_argument(0)?;
                    let key = owned_primitive_string(&mut machine, argument)?;
                    let key = machine.intern_atom(key.as_bytes())?;
                    remember_failure_bytes(b"has-own-get");
                    let own = microesnext::objects::get_own(
                        machine.arena(), machine.root(object)?, key,
                    )?.is_some();
                    machine.release(object)?;
                    Ok(if own {
                        Value::TRUE
                    } else {
                        Value::FALSE
                    })
                })();
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 2500, Ordering::Relaxed);
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
                let key = machine.intern_atom(b"slice").unwrap();
                if microesnext::objects::get(machine.arena(), prototype, key)
                    .map_or(true, |value| value == microesnext::Value::UNDEFINED)
                {
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
                let request_length = match machine.host_argument(1)
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
                    if request_length as usize > buffer.len() {
                        DETAIL.store(request_length, Ordering::Relaxed);
                        break u32::MAX;
                    }
                    unsafe { msg(buffer.as_mut_ptr() as u32, buffer.len() as u32) }
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
            Ok(Outcome::HostCall { function, .. }) if function.index() == STRING => {
                let result = machine.host_argument(0)
                    .or(Ok(Value::UNDEFINED))
                    .and_then(|value| owned_primitive_string(&mut machine, value))
                    .and_then(|value| machine.new_string(value.as_bytes()));
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 2300, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, receiver, .. })
                if function.index() == STRING_SPLIT =>
            {
                let result = (|| {
                    let text = owned_string(&machine, receiver.ok_or(Error::Type)?)?;
                    let separator = machine.host_argument(0).ok()
                        .filter(|value| *value != Value::UNDEFINED);
                    let pieces: Vec<String> = match separator {
                        None => vec![text],
                        Some(separator) if owned_string(&machine, separator).is_ok_and(|value| value.is_empty()) =>
                            text.chars().map(|character| character.to_string()).collect(),
                        Some(separator) => match owned_string(&machine, separator) {
                            Ok(separator) => text.split(&separator).map(String::from).collect(),
                            Err(_) => regexp_split(&mut machine, separator, &text)?,
                        },
                    };
                    let mut result = microesnext::arrays::new(machine.arena_mut())?;
                    for (index, piece) in pieces.iter().enumerate() {
                        let value = machine.new_string(piece.as_bytes())?;
                        result = microesnext::arrays::set(
                            machine.arena_mut(), result, index, value,
                        )?;
                    }
                    Ok(result)
                })();
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 2000, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, receiver, .. })
                if function.index() == STRING_REPLACE =>
            {
                let result = (|| {
                    let standalone = receiver.is_none()
                        || receiver.and_then(Value::as_host).is_some_and(|value| value.index() == GLOBAL_THIS);
                    let offset = usize::from(standalone);
                    let source = if standalone {
                        machine.host_argument(0).map_err(|_| 1_u32)?
                    } else { receiver.ok_or(1_u32)? };
                    let text = owned_string(&machine, source)
                        .map_err(|_| 2_u32)?;
                    let search = machine.host_argument(offset).map_err(|_| 3_u32)?;
                    let replacement_value = machine.host_argument(offset + 1).map_err(|_| 4_u32)?;
                    let replacement = owned_string(&machine, replacement_value)
                        .map_err(|_| 5_u32)?;
                    let replaced = match owned_string(&machine, search) {
                        Ok(search) => text.replacen(&search, &replacement, 1),
                        Err(_) => regexp_replace(&mut machine, search, &text, &replacement)
                            .map_err(|_| 6_u32)?,
                    };
                    machine.new_string(replaced.as_bytes()).map_err(|_| 7_u32)
                })();
                if let Err(step) = result.as_ref() {
                    DETAIL.store(2600 + step, Ordering::Relaxed);
                    break u32::MAX;
                }
                match machine.complete_host_call(result.unwrap()) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 2700, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, receiver, .. })
                if function.index() == STRING_TO_LOWER_CASE =>
            {
                let result = receiver.ok_or(Error::Type)
                    .and_then(|value| owned_string(&machine, value))
                    .and_then(|value| machine.new_string(value.to_lowercase().as_bytes()));
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 2800, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, receiver, .. })
                if function.index() == STRING_SLICE =>
            {
                let result = (|| {
                    let text = owned_string(&machine, receiver.ok_or(Error::Type)?)?;
                    let units: Vec<u16> = text.encode_utf16().collect();
                    let length = i32::try_from(units.len()).map_err(|_| Error::Type)?;
                    let relative = |value: Option<Value>, default: i32| {
                        value
                            .filter(|value| *value != Value::UNDEFINED)
                            .and_then(Value::as_i30)
                            .unwrap_or(default)
                    };
                    let clamp = |value: i32| {
                        if value < 0 { (length + value).max(0) } else { value.min(length) }
                    };
                    let start = clamp(relative(machine.host_argument(0).ok(), 0));
                    let end = clamp(relative(machine.host_argument(1).ok(), length));
                    let end = end.max(start);
                    let sliced = String::from_utf16_lossy(&units[start as usize..end as usize]);
                    machine.new_string(sliced.as_bytes())
                })();
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 2850, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, receiver, .. })
                if function.index() == NUMBER_TO_STRING =>
            {
                let result = (|| {
                    let receiver = receiver.ok_or(Error::Type)?;
                    let number = machine.number(receiver)?;
                    let radix = machine.host_argument(0).ok()
                        .filter(|value| *value != Value::UNDEFINED)
                        .and_then(Value::as_i30)
                        .unwrap_or(10);
                    if !(2..=36).contains(&radix) { return Err(Error::Type); }
                    let text = if radix == 10 || number != libm::trunc(number) {
                        number.to_string()
                    } else {
                        let mut value = number as i64;
                        let negative = value < 0;
                        if negative { value = -value; }
                        let mut digits = [0_u8; 65];
                        let mut at = digits.len();
                        loop {
                            let digit = (value % i64::from(radix)) as u8;
                            at -= 1;
                            digits[at] = if digit < 10 { b'0' + digit } else { b'a' + digit - 10 };
                            value /= i64::from(radix);
                            if value == 0 { break; }
                        }
                        if negative { at -= 1; digits[at] = b'-'; }
                        String::from(core::str::from_utf8(&digits[at..]).map_err(|_| Error::Type)?)
                    };
                    machine.new_string(text.as_bytes())
                })();
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 2500, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, .. })
                if function.index() == PARSE_INT || function.index() == PARSE_FLOAT =>
            {
                let result = (|| {
                    let text = owned_string(&machine, machine.host_argument(0)?)?;
                    if function.index() == PARSE_FLOAT {
                        let number = text.trim().parse::<f64>().map_err(|_| Error::Type)?;
                        return machine.new_number(number);
                    }
                    let radix = machine.host_argument(1).ok()
                        .filter(|value| *value != Value::UNDEFINED)
                        .and_then(Value::as_i30)
                        .unwrap_or(10);
                    let radix = u32::try_from(radix).ok().filter(|radix| (2..=36).contains(radix))
                        .ok_or(Error::Type)?;
                    let trimmed = text.trim_start();
                    let (negative, digits) = trimmed.strip_prefix('-').map_or(
                        (false, trimmed), |digits| (true, digits),
                    );
                    let digits = digits.strip_prefix('+').unwrap_or(digits);
                    let length = digits.chars().take_while(|character| character.to_digit(radix).is_some())
                        .map(char::len_utf8).sum::<usize>();
                    if length == 0 { return Err(Error::Type); }
                    let mut number = i32::from_str_radix(&digits[..length], radix).map_err(|_| Error::Type)?;
                    if negative { number = -number; }
                    Value::from_i30(number).ok_or(Error::Type)
                })();
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 2100, Ordering::Relaxed);
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
            Ok(Outcome::HostCall { function, .. }) if function.index() == SYMBOL => {
                let sequence = SYMBOL_SEQUENCE.fetch_add(1, Ordering::Relaxed);
                let mut name = String::from("@@symbol:");
                use core::fmt::Write;
                let result = write!(&mut name, "{sequence}")
                    .map_err(|_| Error::Type)
                    .and_then(|()| machine.intern_atom(name.as_bytes()));
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 2200, Ordering::Relaxed);
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
                if function.index() == WEAK_REF_DEREF =>
            {
                let result = receiver
                    .ok_or(Error::Type)
                    .and_then(|object| object_get(&mut machine, object, b"value"));
                match result.and_then(|value| machine.complete_host_call(value)) {
                    Ok(()) => {}
                    Err(error) => {
                        DETAIL.store(error as u32 + 1800, Ordering::Relaxed);
                        break u32::MAX;
                    }
                }
            }
            Ok(Outcome::HostCall { function, receiver, .. })
                if function.index() == REGEXP_TEST || function.index() == REGEXP_EXEC =>
            {
                remember_failure_bytes(b"regexp-parts");
                let result = (|| {
                    let receiver = receiver.ok_or(Error::Type)?;
                    remember_failure_bytes(b"regexp-text");
                    let argument = machine.host_argument(0)?;
                    let text = owned_primitive_string(&mut machine, argument)?;
                    remember_failure_bytes(b"regexp-match");
                    let found = regexp_match(&mut machine, receiver, &text)?;
                    if function.index() == REGEXP_TEST {
                        return Ok(if found.is_some() { Value::TRUE } else { Value::FALSE });
                    }
                    let Some((begin, _end, groups)) = found else {
                        return Ok(Value::NULL);
                    };
                    let mut result = machine.new_object(Value::NULL)?;
                    let group_count = groups.len();
                    for (index, group) in groups.into_iter().enumerate() {
                        let value = if let Some(range) = group {
                            machine.new_string(&text.as_bytes()[range])?
                        } else {
                            Value::UNDEFINED
                        };
                        let key = Value::from_i30(i32::try_from(index).map_err(|_| Error::Type)?)
                            .ok_or(Error::Type)?;
                        result = object_set_key(&mut machine, result, key, value)?;
                    }
                    let length = Value::from_i30(i32::try_from(group_count).map_err(|_| Error::Type)?)
                        .ok_or(Error::Type)?;
                    result = object_set(&mut machine, result, b"length", length)?;
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
                // The canonical DOM currently uses Proxy only as a dataset
                // facade. Until proxy traps become an engine capability, keep
                // the ordinary target object rather than involving the host.
                if constructor.index() == PROXY {
                    let result = machine.host_argument(0)
                        .and_then(|target| machine.complete_host_construct(target));
                    match result {
                        Ok(()) => continue,
                        Err(error) => {
                            DETAIL.store(error as u32 + 2900, Ordering::Relaxed);
                            break u32::MAX;
                        }
                    }
                }
                if [ERROR, RANGE_ERROR, SYNTAX_ERROR, TYPE_ERROR].contains(&constructor.index()) {
                    let result = (|| {
                        let message = machine.host_argument(0).unwrap_or(Value::UNDEFINED);
                        let object = machine.new_object(Value::NULL)?;
                        object_set(&mut machine, object, b"message", message)
                    })();
                    match result.and_then(|error| machine.complete_host_construct(error)) {
                        Ok(()) => continue,
                        Err(error) => {
                            DETAIL.store(error as u32 + 3000, Ordering::Relaxed);
                            break u32::MAX;
                        }
                    }
                }
                if constructor.index() == WEAK_REF {
                    let result = (|| {
                        let value = machine.host_argument(0)?;
                        let object = machine.new_object(Value::NULL)?;
                        let object = object_set(&mut machine, object, b"value", value)?;
                        object_set(
                            &mut machine,
                            object,
                            b"deref",
                            Value::from_host(
                                microesnext::HostRef::new(WEAK_REF_DEREF).unwrap(),
                            ),
                        )
                    })();
                    match result.and_then(|object| machine.complete_host_construct(object)) {
                        Ok(()) => continue,
                        Err(error) => {
                            DETAIL.store(error as u32 + 1800, Ordering::Relaxed);
                            break u32::MAX;
                        }
                    }
                }
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
                if [UINT16_ARRAY, UINT32_ARRAY].contains(&constructor.index()) {
                    let length = machine.host_argument(0).ok().and_then(Value::as_i30)
                        .and_then(|value| usize::try_from(value).ok());
                    let Some(length) = length else {
                        DETAIL.store(310, Ordering::Relaxed);
                        break u32::MAX;
                    };
                    let result = (|| {
                        let mut array = microesnext::arrays::new(machine.arena_mut())?;
                        for index in 0..length {
                            array = microesnext::arrays::set(
                                machine.arena_mut(), array, index,
                                Value::from_i30(0).ok_or(Error::Type)?,
                            )?;
                        }
                        machine.complete_host_construct(array)
                    })();
                    match result {
                        Ok(()) => continue,
                        Err(error) => {
                            DETAIL.store(error as u32 + 310, Ordering::Relaxed);
                            break u32::MAX;
                        }
                    }
                }
                if constructor.index() == REGEXP {
                    let result = (|| {
                        let pattern = machine.host_argument(0).map_err(|_| 1_u32)?;
                        let flags = machine.host_argument(1).unwrap_or(Value::UNDEFINED);
                        let pattern_text = owned_string(&machine, pattern).map_err(|_| 2_u32)?;
                        let flags_text = if flags == Value::UNDEFINED {
                            String::new()
                        } else {
                            owned_string(&machine, flags).map_err(|_| 3_u32)?
                        };
                        compile_regexp(&pattern_text, &flags_text).map_err(|_| 4_u32)?;
                        let mut object = machine.new_object(Value::NULL)
                            .map_err(|error| 50_u32 + error as u32)?;
                        object = object_set(&mut machine, object, b"source", pattern).map_err(|_| 6_u32)?;
                        let flags = machine.new_string(flags_text.as_bytes()).map_err(|_| 7_u32)?;
                        object = object_set(&mut machine, object, b"flags", flags).map_err(|_| 8_u32)?;
                        object = object_set(
                            &mut machine,
                            object,
                            b"lastIndex",
                            Value::from_i30(0).ok_or(9_u32)?,
                        ).map_err(|_| 10_u32)?;
                        object = object_set(
                            &mut machine,
                            object,
                            b"test",
                            Value::from_host(microesnext::HostRef::new(REGEXP_TEST).unwrap()),
                        ).map_err(|_| 11_u32)?;
                        object_set(
                            &mut machine,
                            object,
                            b"exec",
                            Value::from_host(microesnext::HostRef::new(REGEXP_EXEC).unwrap()),
                        ).map_err(|_| 12_u32)
                    })();
                    if let Err(step) = result.as_ref() {
                        DETAIL.store(900 + step, Ordering::Relaxed);
                        break u32::MAX;
                    }
                    match machine.complete_host_construct(result.unwrap()) {
                        Ok(()) => continue,
                        Err(error) => {
                            DETAIL.store(error as u32 + 1000, Ordering::Relaxed);
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
                if let Some(key) = machine.last_method_key() {
                    remember_failure_key(&machine, key);
                }
                if let Some(opcode) = machine.last_opcode() {
                    let mut context = String::new();
                    if let Some(key) = machine.last_method_key().and_then(|key| machine.string_bytes(key).ok()) {
                        if let Ok(key) = core::str::from_utf8(key) { context.push_str(key); }
                    }
                    use core::fmt::Write;
                    let call = machine.last_call_value().map_or(999_u32, |value| {
                        value.as_ref()
                            .and_then(|reference| machine.arena().kind(reference).ok())
                            .map_or(value.raw(), |kind| 200 + kind as u32)
                    });
                    let describe = |value: Option<Value>| value.map_or(999_u32, |value| {
                        value.as_ref()
                            .and_then(|reference| machine.arena().kind(reference).ok())
                            .map_or(value.raw(), |kind| 200 + kind as u32)
                    });
                    let (left, right) = machine.last_operands();
                    let _ = write!(
                        context,
                        "; op={:?}; call={}; left={}; right={}; sp={}; base={}; frame={}; error={:?}",
                        opcode,
                        call,
                        describe(left),
                        describe(right),
                        machine.stack_len(),
                        machine.frame_base(),
                        machine.frame_header().map_or(999_u32, Value::raw),
                        error
                    );
                    remember_failure_bytes(context.as_bytes());
                }
                if machine.last_method_key().and_then(|key| machine.string_bytes(key).ok()) == Some(b"slice") {
                    if let Ok(Some(prototype)) = machine.array_prototype_value() {
                        let mut context = String::from("array prototype ");
                        if let Some(key) = machine.last_method_key() {
                            if let Ok(value) = microesnext::objects::get(machine.arena(), prototype, key) {
                                use core::fmt::Write;
                                let _ = write!(context, "requested={}; ", value.raw());
                            }
                        }
                        context.push_str("keys=");
                        if let Ok(count) = microesnext::objects::own_property_count(machine.arena(), prototype) {
                            use core::fmt::Write;
                            let _ = write!(context, "{} ", count);
                            for index in 0..count {
                                if let Ok(key) = microesnext::objects::own_property_key(machine.arena(), prototype, index) {
                                    if let Ok(bytes) = machine.string_bytes(key) {
                                        if let Ok(text) = core::str::from_utf8(bytes) {
                                            context.push_str(text);
                                            if text == "slice" {
                                                if let Ok(value) = microesnext::objects::get(machine.arena(), prototype, key) {
                                                    let _ = write!(context, "={}", value.raw());
                                                }
                                            }
                                            context.push(',');
                                        }
                                    }
                                }
                            }
                        }
                        remember_failure_bytes(context.as_bytes());
                    }
                }
                let receiver_detail = || machine.last_method_receiver().map_or(2, |receiver| {
                    if receiver.as_i30().is_some() { 101 }
                    else if receiver.as_host().is_some() { 102 }
                    else if let Some(reference) = receiver.as_ref() {
                        machine.arena().kind(reference).map_or(199, |kind| 200 + kind as u32)
                    } else { 300 + receiver.raw() }
                });
                let missing_of_prototype = machine.last_method_key()
                    .filter(|key| machine.string_bytes(*key) == Ok(b"of"))
                    .and_then(|_| machine.last_method_receiver())
                    .and_then(|receiver| microesnext::objects::prototype(machine.arena(), receiver).ok());
                if let Some(prototype) = missing_of_prototype {
                    let mut keys = String::new();
                    if let Ok(count) = microesnext::objects::own_property_count(machine.arena(), prototype) {
                        for index in 0..count {
                            if let Ok(key) = microesnext::objects::own_property_key(machine.arena(), prototype, index) {
                                if let Ok(bytes) = machine.string_bytes(key) {
                                    if !keys.is_empty() { keys.push(','); }
                                    if let Ok(text) = core::str::from_utf8(bytes) { keys.push_str(text); }
                                }
                            }
                        }
                    }
                    if let Some(receiver) = machine.last_method_receiver() {
                        if let Some(key) = machine.last_method_key() {
                            if let Ok(value) = microesnext::objects::get(machine.arena(), receiver, key) {
                                keys.clear();
                                keys.push_str("resolved=");
                                if let Some(reference) = value.as_ref() {
                                    if let Ok(kind) = machine.arena().kind(reference) {
                                        use core::fmt::Write;
                                        let _ = write!(keys, "{:?}", kind);
                                    }
                                } else {
                                    use core::fmt::Write;
                                    let _ = write!(keys, "{}", value.raw());
                                }
                            }
                        }
                    }
                    if let Some(constructor) = machine.last_constructor() {
                        keys.push_str("; ctor=");
                        if let Some(reference) = constructor.as_ref() {
                            if let Ok(kind) = machine.arena().kind(reference) {
                                use core::fmt::Write;
                                let _ = write!(keys, "{:?}", kind);
                            }
                        } else {
                            use core::fmt::Write;
                            let _ = write!(keys, "{}", constructor.raw());
                        }
                    }
                    keys.clear();
                    use core::fmt::Write;
                    let describe = |value: Option<Value>| value.map_or(999_u32, |value| {
                        value.as_ref()
                            .and_then(|reference| machine.arena().kind(reference).ok())
                            .map_or(value.raw(), |kind| 200 + kind as u32)
                    });
                    let _ = write!(
                        keys,
                        "get={}; call={}; error={:?}",
                        describe(machine.last_method_value()),
                        describe(machine.last_call_value()),
                        error,
                    );
                    remember_failure_bytes(keys.as_bytes());
                }
                let detail = if let Some(prototype) = missing_of_prototype {
                    5000 + (error as u32) * 100 + prototype.as_ref().and_then(|reference| machine.arena().kind(reference).ok())
                        .map_or(0, |kind| kind as u32)
                } else if error == Error::DanglingReference {
                    receiver_detail()
                } else if error == Error::Type {
                    400 + receiver_detail()
                } else { error as u32 + 1 };
                DETAIL.store(detail, Ordering::Relaxed);
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
