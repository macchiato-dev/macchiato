use std::{env, fs, path::PathBuf};

use microesnext_compiler::compile_script_with_host_globals;

const HOST_GLOBALS: &[&str] = &[
    "Array", "Boolean", "DOMRect", "Date", "Error", "FileReader", "Function", "Intl",
    "IntersectionObserver", "JSON", "KeyboardEvent", "Map", "Math", "MutationObserver",
    "Number", "Object", "Promise", "Proxy", "RangeError", "RegExp", "ResizeObserver", "Set", "String", "Symbol",
    "SyntaxError", "TypeError", "Uint8Array", "Uint16Array", "Uint32Array", "WeakMap", "WeakRef", "WeakSet",
    "Window", "bridge", "cancelIdleCallback", "clearInterval", "clearTimeout", "console", "document",
    "gc", "getComputedStyle", "globalThis", "hostNow", "hostReference", "isFinite", "navigator", "parseFloat", "parseInt",
    "performance", "process", "queueMicrotask", "requestAnimationFrame", "requestIdleCallback",
    "releaseHostReference", "releaseHostReferenceLease", "runtimeDateNow", "setInterval", "setTimeout", "window",
    "installArrayPrototype",
];

fn main() {
    println!("cargo:rerun-if-env-changed=MICROESNEXT_APPLICATION_SOURCE");
    println!("cargo:rerun-if-env-changed=MICROESNEXT_GUEST_ENVIRONMENT");
    let source_path = env::var_os("MICROESNEXT_APPLICATION_SOURCE");
    let application = source_path.as_ref().map_or_else(
        || "return 40 + 2;".to_owned(),
        |path| {
            println!("cargo:rerun-if-changed={}", PathBuf::from(path).display());
            fs::read_to_string(path).expect("read MicroESNext application source")
        },
    );
    let mut source = include_str!("array-prototype.js").to_owned();
    source.push('\n');
    source.push_str(include_str!("collections.js"));
    source.push('\n');
    if let Some(path) = env::var_os("MICROESNEXT_GUEST_ENVIRONMENT") {
        println!("cargo:rerun-if-changed={}", PathBuf::from(&path).display());
        source.push_str(&fs::read_to_string(path).expect("read MicroESNext guest environment"));
        source.push('\n');
    }
    source.push_str(&application);
    if env::var_os("MICROESNEXT_GUEST_ENVIRONMENT").is_some() {
        source.push_str("\nvar microESNextMarker = document.getElementById(\"editor\"); microESNextMarker.setAttribute(\"data-children\", String(microESNextMarker.childNodes.length)); dispatch(-1);\n");
    }
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
