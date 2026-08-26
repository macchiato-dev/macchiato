#![no_std]

use core::sync::atomic::{AtomicU32, Ordering};

use microesnext::{Machine, Outcome};

static APPLICATION: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/application.bin"));
static RESULT: AtomicU32 = AtomicU32::new(0);

#[unsafe(no_mangle)]
pub extern "C" fn onmsg(minimum_length: u32) {
    if minimum_length != 0 || RESULT.load(Ordering::Relaxed) != 0 {
        return;
    }
    let mut words = [0_u32; 256];
    let mut machine = Machine::new(APPLICATION, &mut words);
    let raw = match machine.run() {
        Ok(Outcome::Complete(value)) => value.raw(),
        Ok(Outcome::Throw(value)) => value.raw(),
        _ => u32::MAX,
    };
    RESULT.store(raw, Ordering::Relaxed);
}

#[unsafe(no_mangle)]
pub extern "C" fn result() -> u32 {
    RESULT.load(Ordering::Relaxed)
}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    core::arch::wasm32::unreachable()
}
