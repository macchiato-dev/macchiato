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

// Byte-only arena: no alignment promise for typed allocations or GlobalAlloc.
// Bump allocation only; free is a no-op until a reuse policy is needed.
extern "C" {
    static __heap_base: u8;
}
static mut NEXT: usize = 0;

#[no_mangle]
pub extern "C" fn alloc(len: usize) -> *mut u8 {
    unsafe {
        if NEXT == 0 {
            NEXT = core::ptr::addr_of!(__heap_base) as usize;
        }
        let ptr = NEXT;
        let end = ptr.checked_add(len).expect("allocation overflow");
        let pages = (end as u64 + 65535) / 65536;
        let current = core::arch::wasm32::memory_size::<0>() as u64;
        if pages > current {
            assert!(
                core::arch::wasm32::memory_grow::<0>((pages - current) as usize) != usize::MAX,
                "memory exhausted"
            );
        }
        NEXT = end;
        ptr as *mut u8
    }
}

#[no_mangle]
pub extern "C" fn free(_ptr: *mut u8, _len: usize) {}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}
