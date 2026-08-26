use std::{env, fs, process};

use microesnext_compiler::compile_script_with_host_globals;

const HOST_GLOBALS: &[&str] = &[
    "Array",
    "Date",
    "Error",
    "JSON",
    "Map",
    "Math",
    "Object",
    "Promise",
    "RangeError",
    "RegExp",
    "Set",
    "Symbol",
    "TypeError",
    "Uint8Array",
    "WeakMap",
    "WeakSet",
    "clearInterval",
    "clearTimeout",
    "console",
    "document",
    "globalThis",
    "parseFloat",
    "parseInt",
    "performance",
    "queueMicrotask",
    "requestAnimationFrame",
    "setInterval",
    "setTimeout",
    "window",
];

fn line_column(source: &str, offset: usize) -> (usize, usize) {
    let prefix = &source[..offset.min(source.len())];
    let line = prefix.bytes().filter(|byte| *byte == b'\n').count() + 1;
    let column = prefix
        .rsplit_once('\n')
        .map_or(prefix.len(), |(_, tail)| tail.len())
        + 1;
    (line, column)
}

fn excerpt(source: &str, offset: usize) -> &str {
    let start = source[..offset.min(source.len())]
        .rfind('\n')
        .map_or(0, |index| index + 1);
    let end = source[offset.min(source.len())..]
        .find('\n')
        .map_or(source.len(), |index| offset.min(source.len()) + index);
    &source[start..end]
}

fn main() {
    let Some(path) = env::args_os().nth(1) else {
        eprintln!("usage: microesnext-source-check <source.js>");
        process::exit(2);
    };
    let source = fs::read_to_string(&path).unwrap_or_else(|error| {
        eprintln!("{}: {error}", path.to_string_lossy());
        process::exit(2);
    });

    match compile_script_with_host_globals(&source, HOST_GLOBALS) {
        Ok(bytecode) => println!(
            "{}: {} source bytes -> {} bytecode bytes",
            path.to_string_lossy(),
            source.len(),
            bytecode.len(),
        ),
        Err(error) => {
            let (line, column) = line_column(&source, error.offset);
            eprintln!(
                "{}:{line}:{column}: expected {}\n{}",
                path.to_string_lossy(),
                error.expected,
                excerpt(&source, error.offset),
            );
            process::exit(1);
        }
    }
}
