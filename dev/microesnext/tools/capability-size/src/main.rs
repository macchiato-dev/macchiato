#![cfg_attr(target_arch = "wasm32", no_std)]
#![cfg_attr(target_arch = "wasm32", no_main)]

#[cfg(all(target_arch = "wasm32", feature = "async"))]
use microesnext::Value;
#[cfg(target_arch = "wasm32")]
use microesnext::bytecode::Opcode;
#[cfg(target_arch = "wasm32")]
use microesnext::{Core, CoreOutcome};
#[cfg(all(
    target_arch = "wasm32",
    any(
        feature = "arrays",
        feature = "async",
        feature = "exceptions",
        feature = "functions",
        feature = "numbers",
        feature = "objects",
        feature = "strings"
    )
))]
use microesnext::{Machine, Outcome};

#[cfg(all(not(test), target_arch = "wasm32"))]
#[panic_handler]
fn panic(_info: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}

#[cfg(target_arch = "wasm32")]
#[unsafe(no_mangle)]
pub extern "C" fn core_probe() -> i32 {
    let code = [Opcode::ConstI30 as u8, 42, 0, 0, 0, Opcode::Return as u8];
    let mut memory = [0; 32];
    let mut core = Core::new(&code, &mut memory, 0);
    match core.run() {
        Ok(CoreOutcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "async", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn async_probe() -> i32 {
    let code = [
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::Await as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 32];
    let mut machine = Machine::with_root_capacity(&code, &mut memory, 1);
    let Ok(Outcome::Await { continuation, .. }) = machine.run() else {
        return -1;
    };
    match machine.resume(continuation, Value::from_i30(7).unwrap()) {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "exceptions", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn exceptions_probe() -> i32 {
    let code = [
        Opcode::Try as u8,
        12,
        0,
        0,
        0,
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::Throw as u8,
        Opcode::EndTry as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 32];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "arrays", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn arrays_probe() -> usize {
    let code = [
        Opcode::NewArray as u8,
        Opcode::ConstI30 as u8,
        0,
        0,
        0,
        0,
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::SetIndex as u8,
        Opcode::ConstI30 as u8,
        0,
        0,
        0,
        0,
        Opcode::GetIndex as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 64];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1) as usize,
        _ => usize::MAX,
    }
}

#[cfg(all(feature = "collections", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn collections_probe() -> usize {
    let mut memory = [0; 64];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    let map = microesnext::collections::new_map(&mut arena).unwrap();
    microesnext::collections::len(&arena, map).unwrap()
}

#[cfg(all(feature = "functions", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn functions_probe() -> i32 {
    const BODY: u32 = 9;
    let code = [
        Opcode::Closure as u8,
        BODY as u8,
        0,
        0,
        0,
        0,
        0,
        Opcode::CallValue as u8,
        Opcode::Return as u8,
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 48];
    let mut machine = Machine::new(&code, &mut memory);
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "numbers", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn numbers_probe() -> f64 {
    let left = 1.25_f64.to_bits();
    let code = [
        Opcode::ConstF64 as u8,
        left as u8,
        (left >> 8) as u8,
        (left >> 16) as u8,
        (left >> 24) as u8,
        (left >> 32) as u8,
        (left >> 40) as u8,
        (left >> 48) as u8,
        (left >> 56) as u8,
        Opcode::ConstI30 as u8,
        2,
        0,
        0,
        0,
        Opcode::AddNumber as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 48];
    let mut machine = Machine::new(&code, &mut memory);
    let Ok(Outcome::Complete(value)) = machine.run() else {
        return f64::NAN;
    };
    microesnext::numbers::get(machine.arena(), value).unwrap_or(f64::NAN)
}

#[cfg(all(feature = "objects", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn objects_probe() -> i32 {
    let code = [
        Opcode::NewObject as u8,
        Opcode::ConstAtom as u8,
        1,
        0,
        b'x',
        Opcode::ConstI30 as u8,
        42,
        0,
        0,
        0,
        Opcode::SetProperty as u8,
        Opcode::ConstAtom as u8,
        1,
        0,
        b'x',
        Opcode::GetProperty as u8,
        Opcode::Return as u8,
    ];
    let mut memory = [0; 96];
    let mut machine = Machine::with_objects(&code, &mut memory, 1).unwrap();
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.as_i30().unwrap_or(-1),
        _ => -1,
    }
}

#[cfg(all(feature = "strings", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn strings_probe() -> u32 {
    let code = [
        Opcode::ConstString as u8,
        5,
        0,
        b'h',
        b'e',
        b'l',
        b'l',
        b'o',
        Opcode::Return as u8,
    ];
    let mut memory = [0; 48];
    let mut machine = Machine::with_strings(&code, &mut memory, 1).unwrap();
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.raw(),
        _ => 0,
    }
}

#[cfg(all(feature = "symbols", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn symbols_probe() -> u32 {
    let mut memory = [0; 32];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    let first = microesnext::symbols::new(&mut arena, microesnext::Value::UNDEFINED).unwrap();
    let second = microesnext::symbols::new(&mut arena, microesnext::Value::UNDEFINED).unwrap();
    u32::from(first != second && microesnext::symbols::description(&arena, first).is_ok())
}

#[cfg(all(feature = "atoms", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn atoms_probe() -> u32 {
    let code = [
        Opcode::ConstAtom as u8,
        3,
        0,
        b'k',
        b'e',
        b'y',
        Opcode::Return as u8,
    ];
    let mut memory = [0; 48];
    let mut machine = Machine::with_atoms(&code, &mut memory, 1).unwrap();
    match machine.run() {
        Ok(Outcome::Complete(value)) => value.raw(),
        _ => 0,
    }
}

#[cfg(all(feature = "promises", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn promises_probe() -> u32 {
    let mut memory = [0; 48];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    microesnext::promises::pending(&mut arena).unwrap().raw()
}

#[cfg(all(feature = "weak-collections", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn weak_collections_probe() -> u32 {
    let mut memory = [0; 64];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    microesnext::weak_collections::new_weak_map(&mut arena)
        .unwrap()
        .raw()
}

#[cfg(not(target_arch = "wasm32"))]
fn main() {}
