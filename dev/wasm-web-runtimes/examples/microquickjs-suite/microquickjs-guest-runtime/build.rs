use base64::{Engine as _, engine::general_purpose::STANDARD};
use std::{env, fs, path::PathBuf, process::Command};

fn js_string(value: &str) -> String {
    format!("\"{}\"", value
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
        .replace('\r', "\\r")
        .replace('\n', "\\n"))
}

fn compile_bytecode(mqjs: &PathBuf, out: &PathBuf, name: &str, source: &str) -> Vec<u8> {
    let source_path = out.join(format!("{name}.js"));
    let bytecode_path = out.join(format!("{name}.bin"));
    fs::write(&source_path, source).expect("write generated guest source");
    let status = Command::new(mqjs.join("mqjs"))
        .args(["-m32", "-o"])
        .arg(&bytecode_path)
        .arg(&source_path)
        .status()
        .expect("run MicroQuickJS compiler");
    assert!(status.success(), "MicroQuickJS {name} compilation failed");

    fs::read(bytecode_path).expect("read guest bytecode")
}

fn resource_pack(files: &[(String, Vec<u8>)]) -> Vec<u8> {
    let mut header = String::new();
    for (index, (name, bytes)) in files.iter().enumerate() {
        assert!(!name.contains([',', ':', '|']), "resource name contains a pack delimiter");
        if index != 0 { header.push(','); }
        header.push_str(&format!("{name}:{}", bytes.len()));
    }
    let mut packed = header.into_bytes();
    packed.push(b'|');
    for (_, bytes) in files { packed.extend_from_slice(bytes); }
    packed
}

fn guest_runtime_source(root: &PathBuf) -> String {
    let css_path = root.join("../../../../../packages/project-editor/src/constrained-css.js");
    let css = fs::read_to_string(&css_path).expect("read constrained CSS runtime")
        .replace("\nexport { parseCss as parseConstrainedCss };\n", "\n");
    css + &fs::read_to_string(root.join("guest-runtime.js")).expect("read guest runtime")
}

fn main() {
    println!("cargo:rerun-if-env-changed=WWC_REBUILD_EXAMPLES");
    let root = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let examples = root.parent().expect("runtime belongs to examples");
    let package = examples.parent().expect("suite belongs to examples")
        .parent().expect("examples has a runtime root");
    let dist = package.join("dist/pages");
    let mahjong = examples.join("mahjong");
    let cat = examples.join("cat-memory");
    let mqjs = root.join("microquickjs");
    let out = PathBuf::from(env::var("OUT_DIR").unwrap());

    if !mqjs.join("mquickjs.c").is_file() {
        panic!("run examples/scripts/prepare.sh first");
    }

    let mut fonts = Vec::new();
    let mut raw_fonts = Vec::new();
    for (key, name, family, base64_path) in [
        ("space", "space-grotesk", "Space Grotesk", Some("assets/space-grotesk-latin.woff2.b64")),
        ("tileName", "libre-baskerville", "Libre Baskerville", None),
        ("title", "cormorant-garamond", "Cormorant Garamond", None),
    ] {
        let bytes = match base64_path {
            Some(path) => STANDARD.decode(fs::read_to_string(mahjong.join(path))
                .expect("read embedded font").trim()).expect("decode embedded font"),
            None => fs::read(mahjong.join(format!(
                "assets/fonts/{name}-latin-wght-normal.woff2"
            ))).expect("read embedded font"),
        };
        let data = STANDARD.encode(&bytes);
        fonts.push(format!("{key}:{{family:{},style:\"normal\",weight:\"400 700\",display:\"swap\",data:{}}}",
            js_string(family), js_string(&data)));
        raw_fonts.push((format!("{name}.woff2"), bytes));
    }
    let mut application_files = vec![
        ("tiles/ExampleRegular.png".to_string(),
         fs::read(examples.join("vendor/mahjong-tiles/ExampleRegular.png")).expect("read sprite")),
        ("icons/settings.svg".to_string(),
         fs::read(mahjong.join("assets/icons/settings.svg")).expect("read settings icon")),
        ("icons/undo-2.svg".to_string(),
         fs::read(mahjong.join("assets/icons/undo-2.svg")).expect("read undo icon")),
    ];
    for number in 1..=4 {
        application_files.push((format!("tiles/Flower{number}.svg"),
            fs::read(examples.join(format!("vendor/mahjong-tiles/Regular/Flower{number}.svg")))
                .expect("read flower tile")));
    }
    for number in 1..=4 {
        application_files.push((format!("tiles/Season{number}.svg"),
            fs::read(examples.join(format!("vendor/mahjong-tiles/Regular/Season{number}.svg")))
                .expect("read season tile")));
    }
    let packed_resources = resource_pack(&application_files);
    let runtime_resources = format!(
        "var DOCUMENT_TITLE={};var APPLICATION_SCRIPT={};var FONT_RESOURCES={{{}}};var RUNTIME_RESOURCES={{files:{{{}:{},{}:{},{}:decodeBase64({})}}}};\n",
        js_string("Classic Mahjong Solitaire"), js_string("mahjong.js"), fonts.join(","),
        js_string("index.html"),
        js_string(&fs::read_to_string(mahjong.join("index.html")).expect("read index")),
        js_string("style.css"),
        js_string(&fs::read_to_string(mahjong.join("style.css")).expect("read style")),
        js_string("resources.bin"), js_string(&STANDARD.encode(&packed_resources)),
    );
    let guest_runtime = guest_runtime_source(&root);
    let runtime_source = runtime_resources + &guest_runtime;
    let application_source = ["game-model.js", "application.js"].map(|name|
        fs::read_to_string(mahjong.join(name))
            .unwrap_or_else(|_| panic!("read Mahjong {name}"))
    ).join("\n");
    let runtime_bytecode = compile_bytecode(&mqjs, &out, "mahjong-runtime", &runtime_source);
    let application_bytecode = compile_bytecode(&mqjs, &out, "mahjong-application", &application_source);

    let stamp = dist.join("stamp/mahjong");
    fs::create_dir_all(&stamp).expect("create stamp build directory");
    fs::write(stamp.join("runtime.bin"), runtime_bytecode).expect("write runtime bytecode");
    fs::write(stamp.join("application.bin"), application_bytecode)
        .expect("write application bytecode");

    let raw = dist.join("plain-web/mahjong");
    fs::create_dir_all(raw.join("fonts")).expect("create raw build directories");
    fs::write(raw.join("index.html"), "<!doctype html>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>Classic Mahjong Solitaire</title>\n<link rel=\"stylesheet\" href=\"style.css\">\n<main id=\"app\"></main>\n<script src=\"mahjong.js\"></script>\n")
        .expect("write raw index");
    fs::write(raw.join("mahjong.js"), &application_source).expect("write raw application");
    fs::write(raw.join("resources.bin"), &packed_resources).expect("write raw resources");
    let families = ["Space Grotesk", "Libre Baskerville", "Cormorant Garamond"];
    let mut raw_font_css = String::new();
    for ((file, bytes), family) in raw_fonts.iter().zip(families) {
        fs::write(raw.join("fonts").join(file), bytes).expect("write raw font");
        raw_font_css.push_str(&format!(
            "@font-face{{font-family:{};src:url(\"fonts/{}\") format(\"woff2\");font-style:normal;font-weight:400 700;font-display:swap}}\n",
            js_string(family), file));
    }
    raw_font_css.push_str(&fs::read_to_string(mahjong.join("style.css")).expect("read raw style"));
    fs::write(raw.join("style.css"), raw_font_css).expect("write raw style with fonts");

    let cat_index = fs::read_to_string(cat.join("index.html"))
        .expect("read Cat Memory index");
    let cat_style = fs::read_to_string(cat.join("style.css"))
        .expect("read Cat Memory style");
    let cat_application = fs::read_to_string(cat.join("application.js"))
        .expect("read Cat Memory application");
    let cat_runtime_source = format!(
        "var DOCUMENT_TITLE={};var APPLICATION_SCRIPT={};var FONT_RESOURCES={{}};var RUNTIME_RESOURCES={{files:{{{}:{},{}:{}}}}};\n",
        js_string("Cat Memory Match"), js_string("cat-memory.js"),
        js_string("index.html"), js_string(&cat_index),
        js_string("style.css"), js_string(&cat_style),
    ) + &guest_runtime;
    let cat_runtime = compile_bytecode(&mqjs, &out, "cat-memory-runtime", &cat_runtime_source);
    let cat_application = compile_bytecode(
        &mqjs, &out, "cat-memory-application", &cat_application,
    );
    let cat_stamp = dist.join("stamp/cat-memory");
    fs::create_dir_all(&cat_stamp).expect("create Cat Memory stamp directory");
    fs::write(cat_stamp.join("runtime.bin"), cat_runtime)
        .expect("write Cat Memory runtime bytecode");
    fs::write(cat_stamp.join("application.bin"), cat_application)
        .expect("write Cat Memory application bytecode");

    let cat_raw = dist.join("plain-web/cat-memory");
    fs::create_dir_all(&cat_raw).expect("create raw Cat Memory directory");
    fs::write(cat_raw.join("index.html"), cat_index
        .replace("<head>", "<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>Cat Memory Match</title>"))
        .expect("write raw Cat Memory index");
    fs::write(cat_raw.join("style.css"), cat_style).expect("write raw Cat Memory style");
    fs::write(cat_raw.join("cat-memory.js"),
        fs::read(cat.join("application.js")).expect("read Cat Memory application"))
        .expect("write raw Cat Memory application");

    cc::Build::new()
        .include(&mqjs)
        .include(&out)
        .file(mqjs.join("mquickjs.c"))
        .file(mqjs.join("dtoa.c"))
        .file(mqjs.join("libm.c"))
        .file(mqjs.join("cutils.c"))
        .file(root.join("src/guest.c"))
        .define("CONFIG_SMALL", None)
        .include("/usr/wasm32-wasi/include/wasm32-wasi")
        .flag("-mllvm")
        .flag("-wasm-enable-sjlj")
        .flag_if_supported("-Os")
        .flag_if_supported("-fno-math-errno")
        .flag_if_supported("-fno-trapping-math")
        .compile("microquickjs_guest");

    println!("cargo:rustc-link-search=native=/usr/wasm32-wasi/lib/wasm32-wasi");
    println!("cargo:rustc-link-lib=static=setjmp");


    println!("cargo:rerun-if-changed=src/guest.c");
    println!("cargo:rerun-if-changed=microquickjs/mquickjs.c");
    println!("cargo:rerun-if-changed=microquickjs/mquickjs.h");
    println!("cargo:rerun-if-changed=guest-runtime.js");
    println!("cargo:rerun-if-changed=../../../../../packages/project-editor/src/constrained-css.js");
    println!("cargo:rerun-if-changed=../mahjong");
    println!("cargo:rerun-if-changed=../cat-memory");
    println!("cargo:rerun-if-changed=../vendor/mahjong-tiles");
}
