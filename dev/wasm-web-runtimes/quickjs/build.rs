use std::{env, fs, path::{Path, PathBuf}};

fn bytes(name: &str, source: &[u8]) -> String {
    let mut values = source.iter().map(u8::to_string).collect::<Vec<_>>();
    // QuickJS receives the explicit source length, but its lexer also expects
    // a readable sentinel byte immediately after large source buffers.
    values.push("0".into());
    format!("static const unsigned char {name}[] = {{{}}};\nstatic const unsigned int {name}_length = {};\n", values.join(","), source.len())
}

fn source(variable: &str, fallback: &str) -> (Vec<u8>, Option<PathBuf>) {
    match env::var(variable) {
        Ok(path) => {
            let path = Path::new(&path).canonicalize().expect("canonical guest source path");
            (fs::read(&path).expect("read guest source"), Some(path))
        }
        Err(_) => (fallback.as_bytes().to_vec(), None),
    }
}

fn main() {
    let root = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let quickjs = root.join("quickjs");
    let libc = root.join("libc-ponyfill/include");
    let out = PathBuf::from(env::var("OUT_DIR").unwrap());
    let (environment, environment_path) = source("WWC_GUEST_ENVIRONMENT", "");
    let (application, application_path) = source(
        "WWC_APPLICATION_SOURCE",
        "let lease=hostReference(41);lease=null;class Runtime{static name='QuickJS'};`${Runtime?.name}:${[20,22].reduce((a,b)=>a+b)}`",
    );
    fs::write(out.join("guest-source.h"),
        bytes("guest_environment", &environment) + &bytes("guest_application", &application))
        .expect("write generated guest source header");

    let mut build = cc::Build::new();
    if let Ok(limit) = env::var("WWC_QUICKJS_MEMORY_LIMIT") {
        build.define("QUICKJS_MEMORY_LIMIT", Some(limit.as_str()));
    }
    if env::var_os("WWC_CANONICAL_HOST").is_some() {
        build.define("WWC_CANONICAL_HOST", None);
    }
    build
        .include(&libc)
        .include(&quickjs)
        .include(&out)
        .file(quickjs.join("quickjs.c"))
        .file(quickjs.join("dtoa.c"))
        .file(quickjs.join("libregexp.c"))
        .file(quickjs.join("libunicode.c"))
        .file(quickjs.join("cutils.c"))
        .file(root.join("libc-ponyfill/libc.c"))
        .file(root.join("libc-ponyfill/format.c"))
        .file(root.join("libc-ponyfill/time.c"))
        .file(root.join("src/guest.c"))
        .define("CONFIG_VERSION", Some("\"2026-06-04\""))
        .define("WASM_WEB_CONTAINER", None)
        .flag_if_supported("-Os")
        .flag_if_supported("-fno-math-errno")
        .flag_if_supported("-fno-trapping-math")
        .compile("quickjs_guest");

    println!("cargo:rerun-if-changed=src/guest.c");
    println!("cargo:rerun-if-changed=libc-ponyfill");
    println!("cargo:rerun-if-changed=quickjs");
    println!("cargo:rerun-if-env-changed=WWC_QUICKJS_MEMORY_LIMIT");
    println!("cargo:rerun-if-env-changed=WWC_CANONICAL_HOST");
    println!("cargo:rerun-if-env-changed=WWC_GUEST_ENVIRONMENT");
    println!("cargo:rerun-if-env-changed=WWC_APPLICATION_SOURCE");
    if let Some(path) = environment_path { println!("cargo:rerun-if-changed={}", path.display()); }
    if let Some(path) = application_path { println!("cargo:rerun-if-changed={}", path.display()); }
}
