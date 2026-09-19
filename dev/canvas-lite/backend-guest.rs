#![no_std]

// Message 4 carries the page; it is produced by the agent process, not the server.
static PAGE: &str = concat!(
    "\x04",
    r#"<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Canvas Lite</title>
</head>
<body>
    <main></main>
    <p>The canvas agent supplied this page over stdin/stdout.</p>
    <noscript>This app needs JavaScript and WebAssembly.</noscript>
    <script type="module" src="./frontend.js"></script>
</body>
</html>
"#
);

#[link(wasm_import_module = "host")]
extern "C" {
    fn msg(ptr: *const u8, len: usize);
}

#[no_mangle]
pub extern "C" fn run() {
    send(&[0]); // Ask the host for application argv, without Deno's own flags.
}

fn send(bytes: &[u8]) {
    unsafe { msg(bytes.as_ptr(), bytes.len()) }
}

fn word(bytes: &[u8], pos: &mut usize) -> usize {
    let value = u32::from_le_bytes(bytes[*pos..*pos + 4].try_into().unwrap());
    *pos += 4;
    value as usize
}

fn argument<'a>(bytes: &'a [u8], pos: &mut usize) -> &'a [u8] {
    let len = word(bytes, pos);
    let value = &bytes[*pos..*pos + len];
    *pos += len;
    value
}

// Argv is a u32 count followed by u32-length-prefixed UTF-8 strings.
#[no_mangle]
pub unsafe extern "C" fn arguments(ptr: *const u8, len: usize) {
    let bytes = core::slice::from_raw_parts(ptr, len);
    let mut pos = 0;
    let count = word(bytes, &mut pos);
    let first = if count > 0 {
        argument(bytes, &mut pos)
    } else {
        b""
    };
    let mut command = false;
    for index in 1..count {
        let arg = argument(bytes, &mut pos);
        if index == 1 {
            command = !arg.is_empty();
        }
    }
    assert!(pos == bytes.len());
    if count == 1 && first == b"agent" {
        send(&[1]);
    } else if first == b"--" && command {
        send(&[2]);
    } else {
        send(&[3]);
    }
}

#[no_mangle]
pub extern "C" fn request() {
    send(&[5]); // Ask the host to exchange a request with the configured child.
}

#[no_mangle]
pub extern "C" fn input(byte: u32) {
    if byte == 0 {
        send(PAGE.as_bytes());
    } else {
        send(&[3]);
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
