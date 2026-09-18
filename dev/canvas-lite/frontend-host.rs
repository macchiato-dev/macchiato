#![no_std]

// Trusted host functions, compiled once and retained by reference in the runner.
static DISPLAY: &str = r#"(env, ptr, len) => {
    const bytes = new Uint8Array(env.wasm.memory.buffer, ptr, len);
    document.querySelector('main').textContent = new TextDecoder().decode(bytes);
}"#;

static START: &str = r#"async (env) => {
    let guest;
    const { instance } = await WebAssembly.instantiateStreaming(
        fetch(new URL('frontend-guest.wasm', env.root)),
        { host: { msg(ptr, len) {
            const bytes = new Uint8Array(guest.memory.buffer, ptr >>> 0, len >>> 0);
            const copy = env.wasm.alloc(bytes.length) >>> 0;
            try {
                new Uint8Array(env.wasm.memory.buffer, copy, bytes.length).set(bytes);
                env.wasm.onmsg(copy, bytes.length);
            } finally {
                env.wasm.free(copy, bytes.length);
            }
        } } },
    );
    guest = instance.exports;
    guest.run();
}"#;

#[link(wasm_import_module = "runner")]
extern "C" {
    fn compile(ptr: *const u8, len: usize) -> u32;
    fn call(reference: u32, ptr: *const u8, len: usize) -> u32;
}

static mut DISPLAY_REF: u32 = 0;

#[no_mangle]
pub extern "C" fn start() -> u32 {
    unsafe {
        DISPLAY_REF = compile(DISPLAY.as_ptr(), DISPLAY.len());
        let startup = compile(START.as_ptr(), START.len());
        call(startup, core::ptr::null(), 0)
    }
}

#[no_mangle]
pub extern "C" fn onmsg(ptr: *const u8, len: usize) {
    unsafe {
        call(DISPLAY_REF, ptr, len);
    }
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
