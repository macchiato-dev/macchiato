#![no_std]

use core::{cell::UnsafeCell, sync::atomic::{AtomicU32, Ordering}};

use microesnext::{Machine, Outcome};

static APPLICATION: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/application.bin"));
static RESULT: AtomicU32 = AtomicU32::new(0);
static DETAIL: AtomicU32 = AtomicU32::new(0);
static STAGE: AtomicU32 = AtomicU32::new(0);
static PROGRAM_COUNTER: AtomicU32 = AtomicU32::new(0);
static FRAME: AtomicU32 = AtomicU32::new(0);
static FUNCTION: AtomicU32 = AtomicU32::new(0);

const OBJECT: u32 = 15;
const OBJECT_CREATE: u32 = (1 << 29) + 1;
const OBJECT_DEFINE_PROPERTY: u32 = (1 << 29) + 2;
const MATH: u32 = 12;
const MATH_FUNCTION: u32 = (1 << 29) + 100;
const UINT8_ARRAY: u32 = 26;
const BRIDGE: u32 = 33;
const GLOBAL_THIS: u32 = 41;
const INSTALL_ARRAY_PROTOTYPE: u32 = 59;

struct WordMemory(UnsafeCell<[u32; 1_048_576]>);

// WebAssembly calls this runtime on one thread. Reentrant delivery is handled
// only after the persistent machine is installed below.
unsafe impl Sync for WordMemory {}
static WORDS: WordMemory = WordMemory(UnsafeCell::new([0; 1_048_576]));

#[link(wasm_import_module = "host")]
unsafe extern "C" {
    fn msg(offset: u32, capacity: u32) -> u32;
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
    let raw = loop {
        STAGE.fetch_add(1, Ordering::Relaxed);
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
                        machine.define_property(object, key, descriptor)
                    });
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
                DETAIL.store(constructor.index(), Ordering::Relaxed);
                break u32::MAX - 5;
            }
            Ok(Outcome::HostGet { object, .. }) => {
                DETAIL.store(object.index(), Ordering::Relaxed);
                break u32::MAX - 2;
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

#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    core::arch::wasm32::unreachable()
}
