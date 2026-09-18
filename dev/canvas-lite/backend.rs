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

#[no_mangle]
pub extern "C" fn text_ptr() -> *const u8 {
    PAGE.as_ptr()
}

#[no_mangle]
pub extern "C" fn text_len() -> usize {
    PAGE.len()
}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! {
    core::arch::wasm32::unreachable()
}
