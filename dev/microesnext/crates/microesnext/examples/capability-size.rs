#![cfg_attr(target_arch = "wasm32", no_std)]
#![cfg_attr(target_arch = "wasm32", no_main)]

#[cfg(target_arch = "wasm32")]
use microesnext::bytecode::Opcode;
#[cfg(target_arch = "wasm32")]
use microesnext::{Core, CoreOutcome};

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

#[cfg(all(feature = "arrays", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn arrays_probe() -> usize {
    let mut memory = [0; 64];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    let array = microesnext::arrays::new(&mut arena).unwrap();
    let array = microesnext::arrays::push(&mut arena, array, microesnext::Value::TRUE).unwrap();
    microesnext::arrays::len(&arena, array).unwrap()
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
pub extern "C" fn functions_probe() -> u32 {
    let mut memory = [0; 32];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    microesnext::functions::capture_stack(&mut arena, 7, 0)
        .unwrap()
        .raw()
}

#[cfg(all(feature = "objects", target_arch = "wasm32"))]
#[unsafe(no_mangle)]
pub extern "C" fn objects_probe() -> u32 {
    let mut memory = [0; 48];
    let mut arena = microesnext_arena::Arena::new(&mut memory);
    microesnext::objects::new_object(&mut arena, microesnext::Value::NULL)
        .unwrap()
        .raw()
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
