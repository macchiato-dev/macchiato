#![no_std]

// Separate memory from the guest, even though both VMs share the Deno process.
static mut INBOX: [u8; 4096] = [0; 4096];
static RESPOND: &str = "return data;";

#[link(wasm_import_module = "runner")]
extern "C" {
    // Trusted host code can use Deno APIs, subject to the runner's permissions.
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
    unsafe { exec(RESPOND.as_ptr(), RESPOND.len(), inbox_ptr(), len) }
}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}
