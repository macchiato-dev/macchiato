use std::{env, fs, path::{Path, PathBuf}, process::Command};

const ENGINE_SOURCES: &[&str] = &["cutils.c", "dtoa.c", "libm.c", "mquickjs.c"];

fn compile_rom_builder(c: &Path, out: &Path) -> PathBuf {
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
            .arg(format!("/I{}", c.join("generator").display()))
            .arg(c.join("generator/mquickjs_build.c"))
            .arg(c.join("generator/mqjs_stdlib.c"))
            .arg(format!("/Fe{}", executable.display()));
    } else {
        command
            .args(["-std=c11", "-O2", "-D_GNU_SOURCE"])
            .arg("-I").arg(c)
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

fn main() {
    let root = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR")
        .expect("Cargo provides CARGO_MANIFEST_DIR"));
    let out = PathBuf::from(env::var_os("OUT_DIR").expect("Cargo provides OUT_DIR"));
    let c = root.join("c");

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

    let builder = compile_rom_builder(&c, &out);
    generate_atoms(&builder, &out);

    let mut build = cc::Build::new();
    build
        .include(&c)
        .include(&out)
        .define("CONFIG_SMALL", None)
        .flag_if_supported("-std=c11")
        .flag_if_supported("-Os")
        .flag_if_supported("-fno-math-errno")
        .flag_if_supported("-fno-trapping-math");
    for file in ENGINE_SOURCES {
        build.file(c.join(file));
    }
    build.compile("microquickjs");

    if env::var("CARGO_CFG_TARGET_FAMILY").as_deref() == Ok("unix") {
        println!("cargo:rustc-link-lib=m");
    }
}
