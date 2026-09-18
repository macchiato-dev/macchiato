#![no_std]

static TEXT: &str = "Canvas Lite — a place to hand files to and from an agent.";

#[no_mangle]
pub extern "C" fn text_ptr() -> *const u8 {
    TEXT.as_ptr()
}

#[no_mangle]
pub extern "C" fn text_len() -> usize {
    TEXT.len()
}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}
