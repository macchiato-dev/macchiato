use std::{env, fs, path::{Path, PathBuf}, process::Command};

const ENGINE_SOURCES: &[&str] = &["dtoa.c", "libm.c", "mquickjs.c"];

fn compile_rom_builder(c: &Path, libc: &Path, out: &Path) -> PathBuf {
    let host = env::var("HOST").expect("Cargo provides HOST");
    let compiler = cc::Build::new()
        .host(&host)
        .target(&host)
        .get_compiler();
    let executable = out.join(if compiler.is_like_msvc() {
        "microquickjs-rom-builder.exe"
    } else {
        "microquickjs-rom-builder"
    });
    let mut command = compiler.to_command();
    if compiler.is_like_msvc() {
        command
            .arg(format!("/I{}", c.display()))
            .arg(format!("/I{}", libc.display()))
            .arg(format!("/I{}", c.join("generator").display()))
            .arg(c.join("generator/mquickjs_build.c"))
            .arg(c.join("generator/mqjs_stdlib.c"))
            .arg(format!("/Fe{}", executable.display()));
    } else {
        command
            .args(["-std=c11", "-O2", "-D_GNU_SOURCE"])
            .arg("-I").arg(c)
            .arg("-I").arg(libc)
            .arg("-I").arg(c.join("generator"))
            .arg(c.join("generator/mquickjs_build.c"))
            .arg(c.join("generator/mqjs_stdlib.c"))
            .arg("-o").arg(&executable);
    }
    let status = command.status().expect("run the host C compiler");
    assert!(status.success(), "compile the MicroQuickJS ROM builder");
    executable
}

fn generate_atoms(builder: &Path, out: &Path) {
    let width = env::var("CARGO_CFG_TARGET_POINTER_WIDTH")
        .expect("Cargo provides the target pointer width");
    let output = Command::new(builder)
        .args([if width == "64" { "-m64" } else { "-m32" }, "-a"])
        .output()
        .expect("run the MicroQuickJS ROM builder");
    assert!(output.status.success(), "generate MicroQuickJS atoms");
    fs::write(out.join("mquickjs_atom.h"), output.stdout)
        .expect("write generated MicroQuickJS atoms");
}

fn generate_stdlib(builder: &Path, out: &Path) {
    let width = env::var("CARGO_CFG_TARGET_POINTER_WIDTH")
        .expect("Cargo provides the target pointer width");
    let output = Command::new(builder)
        .arg(if width == "64" { "-m64" } else { "-m32" })
        .output()
        .expect("run the MicroQuickJS ROM builder");
    assert!(output.status.success(), "generate the MicroQuickJS stdlib");
    fs::write(out.join("test_stdlib.inc"), output.stdout)
        .expect("write generated MicroQuickJS stdlib");
    fs::write(
        out.join("test_stdlib.c"),
        "#include \"host_functions.h\"\n#include \"test_stdlib.inc\"\n",
    )
    .expect("write the MicroQuickJS test stdlib wrapper");
}

fn main() {
    let root = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR")
        .expect("Cargo provides CARGO_MANIFEST_DIR"));
    let out = PathBuf::from(env::var_os("OUT_DIR").expect("Cargo provides OUT_DIR"));
    let c = root.join("c");
    let libc = root.join("libc-ponyfill/include");
    let tests = root.join("tests");

    for file in ENGINE_SOURCES {
        println!("cargo:rerun-if-changed=c/{file}");
    }
    for file in [
        "cutils.h", "dtoa.h", "libm.h", "mquickjs.h", "mquickjs_opcode.h",
        "mquickjs_priv.h", "softfp_template.h", "softfp_template_icvt.h",
        "generator/list.h", "generator/mquickjs_build.c",
        "generator/mquickjs_build.h", "generator/mqjs_stdlib.c",
    ] {
        println!("cargo:rerun-if-changed=c/{file}");
    }

    println!("cargo:rerun-if-changed=libc-ponyfill");
    println!("cargo:rerun-if-changed=tests");

    let is_wasm = env::var("TARGET").as_deref() == Ok("wasm32-unknown-unknown");
    let engine_tests = env::var_os("CARGO_FEATURE_ENGINE_TESTS").is_some();
    // Native builds compile the engine only for the explicit semantic suite.
    if !is_wasm && !engine_tests {
        return;
    }

    let native_headers = tests.join("native-headers");
    let headers = if is_wasm { &libc } else { &native_headers };

    let builder = compile_rom_builder(&c, headers, &out);
    generate_atoms(&builder, &out);
    if engine_tests && !is_wasm {
        generate_stdlib(&builder, &out);
    }

    let mut build = cc::Build::new();
    build
        .include(&c)
        .include(headers)
        .include(&out)
        .define("CONFIG_SMALL", None)
        .flag_if_supported("-std=c11")
        .flag_if_supported("-Os")
        .flag_if_supported("-fno-math-errno")
        .flag_if_supported("-fno-trapping-math");
    for file in ENGINE_SOURCES {
        build.file(c.join(file));
    }
    if engine_tests && !is_wasm {
        build
            .include(&tests)
            .file(tests.join("host_functions.c"))
            .file(tests.join("c_calls.c"))
            .file(out.join("test_stdlib.c"));
    }
    build.compile("microquickjs");

    if env::var("CARGO_CFG_TARGET_FAMILY").as_deref() == Ok("unix") {
        println!("cargo:rustc-link-lib=m");
    }
}
