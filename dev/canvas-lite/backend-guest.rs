#![no_std]

static PAGE: &str = r#"<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Canvas Lite</title>
</head>
<body>
    <main></main>
    <noscript>This app needs JavaScript and WebAssembly.</noscript>
    <script type="module" src="./frontend.js"></script>
</body>
</html>
"#;

#[link(wasm_import_module = "host")]
extern "C" {
    fn msg(ptr: *const u8, len: usize);
}

#[no_mangle]
pub extern "C" fn run() {
    unsafe { msg(PAGE.as_ptr(), PAGE.len()) }
}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}
