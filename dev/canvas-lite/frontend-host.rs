#![no_std]

// A small inbox for the scaffold, not the eventual file-transfer interface.
static mut INBOX: [u8; 4096] = [0; 4096];
static DISPLAY: &str = "document.querySelector('main').textContent = data;";

#[link(wasm_import_module = "runner")]
extern "C" {
    // Trusted host code has the browser's authority. Guest bytes are only data.
    fn exec(code: *const u8, code_len: usize, data: *const u8, data_len: usize);
}

#[link(wasm_import_module = "guest")]
extern "C" {
    fn run();
}

#[no_mangle]
pub extern "C" fn start() {
    unsafe { run() }
}

#[no_mangle]
pub extern "C" fn inbox_ptr() -> *mut u8 {
    core::ptr::addr_of_mut!(INBOX).cast()
}

#[no_mangle]
pub extern "C" fn inbox_capacity() -> usize {
    4096
}

#[no_mangle]
pub extern "C" fn onmsg(len: usize) {
    assert!(len <= inbox_capacity());
    unsafe { exec(DISPLAY.as_ptr(), DISPLAY.len(), inbox_ptr(), len) }
}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}
