use std::{env, fs, path::PathBuf};

use microesnext_compiler::compile_script_with_host_globals_and_source_map;

const HOST_GLOBALS: &[&str] = &[
    "Array", "Boolean", "DOMRect", "Date", "Error", "FileReader", "Function", "Intl",
    "IntersectionObserver", "JSON", "KeyboardEvent", "Map", "Math", "MutationObserver",
    "Number", "Object", "__reservedPromise", "Proxy", "RangeError", "RegExp", "ResizeObserver", "Set", "String", "Symbol",
    "SyntaxError", "TypeError", "Uint8Array", "Uint16Array", "Uint32Array", "WeakMap", "WeakRef", "WeakSet",
    "Window", "bridge", "cancelIdleCallback", "clearInterval", "clearTimeout", "console", "document",
    "gc", "getComputedStyle", "globalThis", "hostNow", "hostReference", "isFinite", "navigator", "parseFloat", "parseInt",
    "performance", "process", "queueMicrotask", "requestAnimationFrame", "requestIdleCallback",
    "releaseHostReference", "releaseHostReferenceLease", "runtimeDateNow", "setInterval", "setTimeout", "window",
    "installArrayPrototype", "isNaN", "microESNextImmediate",
];

fn main() {
    println!("cargo:rerun-if-env-changed=MICROESNEXT_APPLICATION_SOURCE");
    println!("cargo:rerun-if-env-changed=MICROESNEXT_GUEST_ENVIRONMENT");
    println!("cargo:rerun-if-env-changed=MICROESNEXT_DEBUG_ENTRY");
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
    if env::var_os("MICROESNEXT_GUEST_ENVIRONMENT").is_some() {
        // The browser facade replaces selected globals in JavaScript. Keep
        // those replacements lexical for application code without teaching
        // the Rust engine anything about DOM constructor names.
        source.push_str("\nvar Promise = globalThis.Promise;\n");
        source.push_str("\n(function (DOMRect, Date, FileReader, IntersectionObserver, KeyboardEvent, MutationObserver, ResizeObserver, Window, cancelIdleCallback, clearInterval, clearTimeout, devicePixelRatio, getComputedStyle, innerHeight, innerWidth, navigator, pageXOffset, pageYOffset, performance, queueMicrotask, requestAnimationFrame, requestIdleCallback, setInterval, setTimeout, window) {\n");
        source.push_str(&application);
        source.push_str("\nvar microESNextMarker = document.getElementById(\"editor\"); if (microESNextMarker) microESNextMarker.setAttribute(\"data-children\", String(microESNextMarker.childNodes.length)); dispatch(-1);\n");
        source.push_str("})(globalThis.DOMRect, globalThis.Date, globalThis.FileReader, globalThis.IntersectionObserver, globalThis.KeyboardEvent, globalThis.MutationObserver, globalThis.ResizeObserver, globalThis.Window, globalThis.cancelIdleCallback, globalThis.clearInterval, globalThis.clearTimeout, globalThis.devicePixelRatio, globalThis.getComputedStyle, globalThis.innerHeight, globalThis.innerWidth, globalThis.navigator, globalThis.pageXOffset, globalThis.pageYOffset, globalThis.performance, globalThis.queueMicrotask, globalThis.requestAnimationFrame, globalThis.requestIdleCallback, globalThis.setInterval, globalThis.setTimeout, globalThis.window);\n");
    } else {
        source.push_str(&application);
    }
    let (bytecode, source_map) = compile_script_with_host_globals_and_source_map(
        &source,
        HOST_GLOBALS,
    ).unwrap_or_else(|error| {
        panic!(
            "MicroESNext source failed at byte {}: expected {}",
            error.offset, error.expected
        )
    });
    if let Some(entry) = env::var("MICROESNEXT_DEBUG_ENTRY").ok()
        .and_then(|value| value.parse::<usize>().ok())
    {
        if let Some((function, offset)) = source_map
            .iter()
            .filter(|(candidate, _)| *candidate <= entry)
            .max_by_key(|(candidate, _)| *candidate)
        {
            let start = *offset + source[*offset..].len()
                - source[*offset..].trim_start().len();
            let line = source[..start].bytes().filter(|byte| *byte == b'\n').count() + 1;
            let end = source[start..].find('\n').map_or(source.len(), |end| start + end);
            println!("cargo:warning=MicroESNext entry {entry} maps to function {function} at source line {line}: {}",
                &source[start..end]);
        }
    }
    fs::write(
        PathBuf::from(env::var_os("OUT_DIR").expect("OUT_DIR")).join("application.bin"),
        bytecode,
    )
    .expect("write MicroESNext bytecode");
}
