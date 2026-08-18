#![no_std]

unsafe extern "C" {
    fn guest_onmsg(minimum_length: u32);
}

#[unsafe(no_mangle)]
pub extern "C" fn onmsg(minimum_length: u32) {
    unsafe { guest_onmsg(minimum_length) }
}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo<'_>) -> ! {
    loop {}
}
