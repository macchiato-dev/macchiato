#![no_std]

static TEXT: &str = "Canvas Lite — a place to hand files to and from an agent.";

#[link(wasm_import_module = "host")]
extern "C" {
    fn msg(ptr: *const u8, len: usize);
}

#[no_mangle]
pub extern "C" fn run() {
    unsafe { msg(TEXT.as_ptr(), TEXT.len()) }
}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}
