use std::{env, fs, path::PathBuf};

use microesnext_compiler::compile_script_with_host_globals;

const HOST_GLOBALS: &[&str] = &[
    "Array", "Date", "Error", "JSON", "Map", "Math", "Object", "Promise", "RangeError",
    "RegExp", "Set", "TypeError", "Uint8Array", "WeakMap", "WeakSet", "clearInterval",
    "clearTimeout", "console", "document", "globalThis", "parseFloat", "parseInt",
    "performance", "queueMicrotask", "requestAnimationFrame", "setInterval", "setTimeout",
    "window",
];

fn main() {
    println!("cargo:rerun-if-env-changed=MICROESNEXT_APPLICATION_SOURCE");
    let source_path = env::var_os("MICROESNEXT_APPLICATION_SOURCE");
    let source = source_path.as_ref().map_or_else(
        || "return 40 + 2;".to_owned(),
        |path| {
            println!("cargo:rerun-if-changed={}", PathBuf::from(path).display());
            fs::read_to_string(path).expect("read MicroESNext application source")
        },
    );
    let bytecode = compile_script_with_host_globals(&source, HOST_GLOBALS).unwrap_or_else(|error| {
        panic!(
            "MicroESNext source failed at byte {}: expected {}",
            error.offset, error.expected
        )
    });
    fs::write(
        PathBuf::from(env::var_os("OUT_DIR").expect("OUT_DIR")).join("application.bin"),
        bytecode,
    )
    .expect("write MicroESNext bytecode");
}
