use std::{env, fs, process};

use microesnext_compiler::compile_script_with_host_globals;

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
    let mut arguments = env::args_os().skip(1);
    let Some(path) = arguments.next() else {
        eprintln!("usage: microesnext-source-check <source.js> [host-global ...]");
        process::exit(2);
    };
    let host_globals = arguments
        .map(|name| {
            name.into_string().unwrap_or_else(|_| {
                eprintln!("host globals must be UTF-8 JavaScript identifiers");
                process::exit(2);
            })
        })
        .collect::<Vec<_>>();
    let host_globals = host_globals.iter().map(String::as_str).collect::<Vec<_>>();
    let source = fs::read_to_string(&path).unwrap_or_else(|error| {
        eprintln!("{}: {error}", path.to_string_lossy());
        process::exit(2);
    });

    match compile_script_with_host_globals(&source, &host_globals) {
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
