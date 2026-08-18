use std::{env, path::PathBuf};

fn main() {
    let root = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let quickjs = root.join("quickjs");
    let libc = root.join("libc-ponyfill/include");

    let mut build = cc::Build::new();
    if let Ok(limit) = env::var("WWC_QUICKJS_MEMORY_LIMIT") {
        build.define("QUICKJS_MEMORY_LIMIT", Some(limit.as_str()));
    }
    build
        .include(&libc)
        .include(&quickjs)
        .file(quickjs.join("quickjs.c"))
        .file(quickjs.join("dtoa.c"))
        .file(quickjs.join("libregexp.c"))
        .file(quickjs.join("libunicode.c"))
        .file(root.join("libc-ponyfill/libc.c"))
        .file(root.join("libc-ponyfill/format.c"))
        .file(root.join("libc-ponyfill/time.c"))
        .file(root.join("libc-ponyfill/strtod.c"))
        .file(root.join("src/guest.c"))
        .define("CONFIG_VERSION", Some("\"0.16.1\""))
        .define("WASM_WEB_CONTAINER", None)
        .flag_if_supported("-Os")
        .flag_if_supported("-fno-math-errno")
        .flag_if_supported("-fno-trapping-math")
        .compile("quickjs_guest");

    println!("cargo:rerun-if-changed=src/guest.c");
    println!("cargo:rerun-if-changed=libc-ponyfill");
    println!("cargo:rerun-if-changed=quickjs");
    println!("cargo:rerun-if-env-changed=WWC_QUICKJS_MEMORY_LIMIT");
}
