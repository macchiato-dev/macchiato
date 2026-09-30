#![no_std]
// Trusted host: owns browser references, policy, and the child VM's imports.
// The bridge supplies general JS primitives, never permissions for the guest.
use core::fmt::{self, Write};

const CAPACITY: usize = 512 * 1024;
const REFERENCES: usize = 2048;
const DENIED: u32 = u32::MAX;
static mut INBOX: [u8; CAPACITY] = [0; CAPACITY];
static mut IMAGE: [u8; CAPACITY * 4 / 3 + 64] = [0; CAPACITY * 4 / 3 + 64];

#[derive(Clone, Copy)]
struct Node { kind: u8, parent: u32, click: u32, hidden: bool, display: u8 }
const EMPTY: Node = Node { kind: 0, parent: 0, click: 0, hidden: false, display: 0 };
static mut NODES: [Node; REFERENCES] = [EMPTY; REFERENCES];
static mut NEXT: usize = 1;
static mut FREE: [u32; REFERENCES] = [0; REFERENCES];
static mut FREE_COUNT: usize = 0;
static mut IMAGE_BYTES: usize = 0;
static mut IMAGE_PIXELS: u64 = 0;

#[link(wasm_import_module = "bridge")]
extern "C" {
    fn string(p: *const u8, n: usize) -> u32;
    fn number(n: f64) -> u32;
    fn value(id: u32) -> f64;
    fn bytes(p: *mut u8, n: usize) -> u32;
    fn get(id: u32, key: u32) -> u32;
    fn set(id: u32, key: u32, value: u32);
    #[link_name = "call"] fn invoke(id: u32, this: u32, p: *const u32, n: usize) -> u32;
    #[link_name = "new"] fn construct(id: u32, p: *const u32, n: usize) -> u32;
    fn callback(token: u32) -> u32;
    fn release(id: u32);
}

// These handles belong to the host, not to the guest's capability table.
// Temporaries release their slots on return; retained handles have an owner
// in the fixed tables below. Zero means undefined, one is the borrowed global.
struct Ref(u32);
impl Ref {
    fn retain(self) -> u32 { let id = self.0; core::mem::forget(self); id }
}
impl Drop for Ref { fn drop(&mut self) { unsafe { release(self.0); } } }
fn js_string(s: &str) -> Ref { Ref(unsafe { string(s.as_ptr(), s.len()) }) }
fn js_number(n: f64) -> Ref { Ref(unsafe { number(n) }) }
fn property(id: u32, name: &str) -> Ref {
    let key = js_string(name);
    Ref(unsafe { get(id, key.0) })
}
fn assign(id: u32, name: &str, value: u32) {
    let key = js_string(name);
    unsafe { set(id, key.0, value); }
}
fn apply(function: u32, this: u32, args: &[u32]) -> Ref {
    Ref(unsafe { invoke(function, this, args.as_ptr(), args.len()) })
}
fn method(this: u32, name: &str, args: &[u32]) -> Ref {
    let function = property(this, name);
    apply(function.0, this, args)
}
fn new(constructor: u32, args: &[u32]) -> Ref {
    Ref(unsafe { construct(constructor, args.as_ptr(), args.len()) })
}

static mut OBJECTS: [u32; REFERENCES] = [0; REFERENCES];
static mut DOCUMENT: u32 = 0;
static mut CREATE_ELEMENT: u32 = 0;
static mut UINT8_ARRAY: u32 = 0;
static mut GUEST: u32 = 0;
static mut GUEST_MEMORY: u32 = 0;
static mut GUEST_EVENT: u32 = 0;
static mut CLOCK: u32 = 0;
static mut NOW: u32 = 0;
const GUEST_CALL: u32 = REFERENCES as u32;
const TICK: u32 = GUEST_CALL + 1;

#[no_mangle]
pub extern "C" fn start(input: u32) {
    unsafe {
        DOCUMENT = property(1, "document").retain();
        CREATE_ELEMENT = property(DOCUMENT, "createElement").retain();
        OBJECTS[0] = property(DOCUMENT, "body").retain();
        UINT8_ARRAY = property(1, "Uint8Array").retain();
        CLOCK = property(1, "performance").retain();
        NOW = property(CLOCK, "now").retain();
    }
    // Assemble the child's imports here. It gets exactly one restricted
    // callback, not the bridge, global object, or any host reference handles.
    let object = property(1, "Object");
    let imports = new(object.0, &[]);
    let sandbox = new(object.0, &[]);
    let handler = Ref(unsafe { callback(GUEST_CALL) });
    assign(sandbox.0, "call", handler.0);
    assign(imports.0, "sandbox", sandbox.0);
    let wasm = property(1, "WebAssembly");
    let module_type = property(wasm.0, "Module");
    let module = new(module_type.0, &[input]);
    let instance_type = property(wasm.0, "Instance");
    let instance = new(instance_type.0, &[module.0, imports.0]);
    unsafe {
        GUEST = property(instance.0, "exports").retain();
        GUEST_MEMORY = property(GUEST, "memory").retain();
        GUEST_EVENT = property(GUEST, "event").retain();
    }
    let uint32 = property(1, "Uint32Array");
    let one = js_number(1.0);
    let random = new(uint32.0, &[one.0]);
    let crypto = property(1, "crypto");
    method(crypto.0, "getRandomValues", &[random.0]);
    let seed = property(random.0, "0");
    method(unsafe { GUEST }, "start", &[seed.0]);
    let tick = Ref(unsafe { callback(TICK) });
    let interval = js_number(50.0);
    method(1, "setInterval", &[tick.0, interval.0]);
}

#[no_mangle]
pub extern "C" fn dispatch(token: u32, args: u32) -> u32 {
    if token == GUEST_CALL {
        // A Wasm start section cannot use our API before its memory exists.
        if unsafe { GUEST } == 0 { return js_number(DENIED as f64).retain(); }
        let mut fields = [0u32; 6];
        for (i, field) in fields.iter_mut().enumerate() {
            let index = js_number(i as f64);
            let item = Ref(unsafe { get(args, index.0) });
            // i32 imports arrive signed. Preserve bits of negative CSS values.
            *field = unsafe { value(item.0) } as i32 as u32;
        }
        let [op, id, a, b, pointer, length] = fields;
        if length as usize > CAPACITY { return js_number(DENIED as f64).retain(); }
        let target = Ref(unsafe { bytes(inbox(), length as usize) });
        let buffer = property(unsafe { GUEST_MEMORY }, "buffer");
        let offset = js_number(pointer as f64);
        let size = js_number(length as f64);
        // Construction checks the child's memory bounds. Its pointer never
        // becomes a pointer in our memory, and buffer is read afresh on growth.
        let source = new(unsafe { UINT8_ARRAY }, &[buffer.0, offset.0, size.0]);
        method(target.0, "set", &[source.0]);
        return js_number(call(op, id, a, b, length as usize) as f64).retain();
    }
    let click = if token == TICK { 0 } else { event(token) };
    if token == TICK || click != 0 {
        let click = js_number(click as f64);
        let now = apply(unsafe { NOW }, unsafe { CLOCK }, &[]);
        apply(unsafe { GUEST_EVENT }, unsafe { GUEST }, &[click.0, now.0]);
    }
    0
}

#[panic_handler]
fn panic(_: &core::panic::PanicInfo) -> ! { core::arch::wasm32::unreachable() }

#[no_mangle]
pub extern "C" fn inbox() -> *mut u8 { core::ptr::addr_of_mut!(INBOX).cast() }

#[no_mangle]
pub extern "C" fn capacity() -> usize { CAPACITY }

// Zero is the already granted body. No document/window/head references exist.
fn exists(id: u32) -> bool {
    id == 0 || (id as usize) < REFERENCES && unsafe { NODES[id as usize].kind != 0 }
}

fn allocate(kind: u8, parent: u32) -> u32 {
    let n = unsafe {
        if FREE_COUNT != 0 { FREE_COUNT -= 1; FREE[FREE_COUNT] as usize }
        else if NEXT < REFERENCES { let n = NEXT; NEXT += 1; n }
        else { return DENIED; }
    };
    unsafe { NODES[n] = Node { kind, parent, ..EMPTY }; }
    n as u32
}

fn send(op: u32, id: u32, arg: u32, name: &str, value: &str) {
    let object = unsafe { OBJECTS[id as usize] };
    match op {
        0 => {
            let tag = js_string(name);
            let handler = Ref(unsafe { callback(id) });
            let element = apply(unsafe { CREATE_ELEMENT }, unsafe { DOCUMENT }, &[tag.0]);
            assign(element.0, "onclick", handler.0);
            method(unsafe { OBJECTS[arg as usize] }, "append", &[element.0]);
            unsafe { OBJECTS[id as usize] = element.retain(); }
        }
        1 => { let text = js_string(name); assign(object, "textContent", text.0); }
        2 | 3 => {
            let name = js_string(name);
            let value = js_string(value);
            if op == 2 {
                let style = property(object, "style");
                method(style.0, "setProperty", &[name.0, value.0]);
            } else { method(object, "setAttribute", &[name.0, value.0]); }
        }
        4 => { let hidden = js_number(arg as f64); assign(object, "hidden", hidden.0); }
        5 | 8 => {
            if op == 5 { assign(object, "onclick", 0); method(object, "remove", &[]); }
            unsafe { release(object); OBJECTS[id as usize] = 0; }
        }
        6 => { unsafe { OBJECTS[id as usize] = js_string(name).retain(); } }
        7 => { assign(object, "src", unsafe { OBJECTS[arg as usize] }); }
        _ => unreachable!(),
    }
}

struct Text { bytes: [u8; 256], len: usize }
impl Text {
    fn new() -> Self { Self { bytes: [0; 256], len: 0 } }
    fn str(&self) -> &str { core::str::from_utf8(&self.bytes[..self.len]).unwrap() }
}
impl Write for Text {
    fn write_str(&mut self, value: &str) -> fmt::Result {
        let end = self.len.checked_add(value.len()).ok_or(fmt::Error)?;
        if end > self.bytes.len() { return Err(fmt::Error); }
        self.bytes[self.len..end].copy_from_slice(value.as_bytes());
        self.len = end;
        Ok(())
    }
}

// These are semantic property/value identifiers, not arbitrary CSS source.
// Neither list contains a loading primitive, selector, or executable value.
const PROPERTIES: &[&str] = &[
    "width", "height", "max-width", "min-height", "margin", "padding",
    "left", "top", "right", "bottom", "gap", "border-radius", "font-size",
    "z-index", "opacity", "display", "position", "align-items",
    "justify-content", "flex-direction", "flex-wrap", "overflow", "cursor",
    "box-sizing", "font-family", "font-weight", "text-align", "object-fit",
    "container-type", "color", "background-color", "border-color",
    "border-width", "border-style", "pointer-events", "line-height",
    "margin-bottom", "padding-top", "max-height", "min-width",
];
const KEYWORDS: &[&str] = &[
    "none", "block", "flex", "relative", "absolute", "auto", "center",
    "space-between", "column", "row", "wrap", "hidden", "pointer",
    "border-box", "serif", "system-ui, sans-serif", "bold", "normal",
    "contain", "fill", "inline-size", "fixed", "flex-end", "inherit",
    "solid", "left", "right", "inline-block", "visible",
];

// Retire descendants as well as the requested root. IDs are only recycled
// after their browser reference has been dropped; no scan for empty cells.
fn remove(id: u32) {
    loop {
        let child = unsafe { (1..NEXT).find(|&n| NODES[n].kind != 0 && NODES[n].parent == id) };
        match child { Some(n) => remove(n as u32), None => break }
    }
    send(if unsafe { NODES[id as usize].kind } == 11 { 8 } else { 5 }, id, 0, "", "");
    unsafe {
        NODES[id as usize] = EMPTY;
        FREE[FREE_COUNT] = id;
        FREE_COUNT += 1;
    }
}

#[no_mangle]
pub extern "C" fn event(id: u32) -> u32 {
    if id == 0 || !exists(id) { 0 } else { unsafe { NODES[id as usize].click } }
}

#[no_mangle]
pub extern "C" fn call(op: u32, id: u32, a: u32, b: u32, len: usize) -> u32 {
    if !exists(id) || len > CAPACITY { return DENIED; }
    if id != 0 && unsafe { NODES[id as usize].kind == 11 } && op != 7 { return DENIED; }
    // Guest calls are synchronous; these DOM writes don't invoke guest code.
    let bytes = unsafe { core::slice::from_raw_parts(inbox(), len) };
    match op {
        0 => {
            const TAGS: &[&str] = &["div", "main", "header", "h1", "button",
                "span", "section", "img", "footer", "p"];
            let Some(tag) = TAGS.get(a as usize) else { return DENIED; };
            // Void elements cannot parent children. Keep depth bounded too.
            if id != 0 && unsafe { NODES[id as usize].kind == 8 } { return DENIED; }
            let mut ancestor = id;
            for depth in 0..33 {
                if ancestor == 0 { break; }
                if depth == 32 { return DENIED; }
                ancestor = unsafe { NODES[ancestor as usize].parent };
            }
            let n = allocate(a as u8 + 1, id);
            if n == DENIED { return DENIED; }
            send(0, n, id, tag, "");
            n
        }
        1 => {
            if len > 4096 || id == 0 { return DENIED; }
            let Ok(text) = core::str::from_utf8(bytes) else { return DENIED; };
            // textContent replaces children: do not leave stale capabilities.
            loop {
                let child = unsafe { (1..NEXT).find(|&n| NODES[n].kind != 0 && NODES[n].parent == id) };
                match child { Some(n) => remove(n as u32), None => break }
            }
            send(1, id, 0, text, "");
            0
        }
        2 | 3 | 4 => {
            let Some(property) = PROPERTIES.get(a as usize) else { return DENIED; };
            if a == 15 && op != 3 { return DENIED; }
            let mut value = Text::new();
            if op == 2 {
                let number = b as i32;
                if number.unsigned_abs() > 100_000_000 || len != 1 { return DENIED; }
                let Some(unit) = ["", "px", "%", "cqw", "vh", "vw"].get(bytes[0] as usize)
                    else { return DENIED; };
                // Fixed-point thousandths avoid floats and their formatting code.
                // Integer-valued CSS such as z-index rejects a decimal token.
                let result = if number % 1000 == 0 {
                    write!(value, "{}{}", number / 1000, unit)
                } else {
                    write!(value, "{}{}.{:03}{}", if number < 0 { "-" } else { "" },
                        number.unsigned_abs() / 1000, number.unsigned_abs() % 1000, unit)
                };
                if result.is_err() { return DENIED; }
            } else if op == 3 {
                let Some(word) = KEYWORDS.get(b as usize) else { return DENIED; };
                if value.write_str(word).is_err() { return DENIED; }
            } else if write!(value, "#{:08x}", b).is_err() { return DENIED; }
            if a == 15 {
                unsafe { NODES[id as usize].display = b as u8 + 1; }
                if unsafe { NODES[id as usize].hidden } { return 0; }
            }
            send(2, id, 0, property, value.str());
            0
        }
        5 => {
            let Some(name) = ["aria-label", "aria-pressed", "aria-expanded", "role"]
                .get(a as usize) else { return DENIED; };
            if len > 256 { return DENIED; }
            let Ok(text) = core::str::from_utf8(bytes) else { return DENIED; };
            send(3, id, 0, name, text);
            0
        }
        6 => {
            unsafe { NODES[id as usize].hidden = a != 0; }
            let display = unsafe { NODES[id as usize].display };
            send(2, id, 0, "display", if a != 0 { "none" }
                else { KEYWORDS.get(display.wrapping_sub(1) as usize).copied().unwrap_or("") });
            send(4, id, a.min(1), "", "");
            0
        }
        7 if id != 0 => { remove(id); 0 }
        8 if id != 0 => { unsafe { NODES[id as usize].click = a; } 0 }
        9 => {
            // Raster PNG only. No SVG document, URL, or raw HTML enters the DOM.
            if id != 0 || len < 33 ||
                bytes[..8] != *b"\x89PNG\r\n\x1a\n" || bytes[8..16] != *b"\0\0\0\rIHDR"
                { return DENIED; }
            let width = u32::from_be_bytes(bytes[16..20].try_into().unwrap());
            let height = u32::from_be_bytes(bytes[20..24].try_into().unwrap());
            if width == 0 || height == 0 || width > 4096 || height > 4096 ||
                width as u64 * height as u64 > 4_194_304 { return DENIED; }
            // Check chunk boundaries and reject animation. The browser decodes
            // pixels, but cannot be handed an unbounded sequence of PNG frames.
            let mut at = 8;
            let mut data = false;
            let mut end = false;
            while at + 12 <= len {
                let size = u32::from_be_bytes(bytes[at..at+4].try_into().unwrap()) as usize;
                if size > len - at - 12 { return DENIED; }
                match &bytes[at+4..at+8] {
                    b"acTL" | b"fcTL" | b"fdAT" => return DENIED,
                    b"IDAT" => data = true,
                    b"IEND" => { if size != 0 { return DENIED; } end = true; }
                    _ => {}
                }
                at += size + 12;
                if end { break; }
            }
            if !data || !end || at != len { return DENIED; }
            // Cumulative: releasing handles doesn't reset this frame's budget.
            let pixels = width as u64 * height as u64;
            if unsafe { IMAGE_BYTES } + len > 4 * 1024 * 1024 ||
                unsafe { IMAGE_PIXELS } + pixels > 8_388_608 { return DENIED; }
            let image = allocate(11, u32::MAX);
            if image == DENIED { return DENIED; }
            unsafe { IMAGE_BYTES += len; IMAGE_PIXELS += pixels; }
            let output = unsafe { &mut *core::ptr::addr_of_mut!(IMAGE) };
            let prefix = b"data:image/png;base64,";
            output[..prefix.len()].copy_from_slice(prefix);
            let alphabet = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            let mut at = prefix.len();
            for chunk in bytes.chunks(3) {
                let word = (chunk[0] as usize) << 16 |
                    (chunk.get(1).copied().unwrap_or(0) as usize) << 8 |
                    chunk.get(2).copied().unwrap_or(0) as usize;
                output[at] = alphabet[word >> 18];
                output[at + 1] = alphabet[word >> 12 & 63];
                output[at + 2] = if chunk.len() > 1 { alphabet[word >> 6 & 63] } else { b'=' };
                output[at + 3] = if chunk.len() > 2 { alphabet[word & 63] } else { b'=' };
                at += 4;
            }
            send(6, image, 0, core::str::from_utf8(&output[..at]).unwrap(), "");
            image
        }
        10 => {
            if id == 0 || unsafe { NODES[id as usize].kind != 8 } ||
                a == 0 || !exists(a) || unsafe { NODES[a as usize].kind != 11 }
                { return DENIED; }
            send(7, id, a, "", "");
            0
        }
        11 => {
            // Box shadows: up to four (x, y, blur, spread, RGBA) records.
            // Distances are signed thousandths of px or container-width units.
            if len == 0 || len % 20 != 0 || len > 80 { return DENIED; }
            let unit = match a { 1 => "px", 3 => "cqw", _ => return DENIED };
            let mut value = Text::new();
            for (i, record) in bytes.chunks_exact(20).enumerate() {
                if i != 0 { let _ = value.write_str(", "); }
                for field in 0..4 {
                    let offset = field * 4;
                    let n = i32::from_le_bytes(record[offset..offset+4].try_into().unwrap());
                    if n.unsigned_abs() > 100_000 || field == 2 && n < 0 { return DENIED; }
                    if write!(value, "{}{}.{:03}{} ", if n < 0 { "-" } else { "" },
                        n.unsigned_abs()/1000, n.unsigned_abs()%1000, unit).is_err()
                        { return DENIED; }
                }
                let rgba = u32::from_le_bytes(record[16..20].try_into().unwrap());
                if write!(value, "#{:08x}", rgba).is_err() { return DENIED; }
            }
            send(2, id, 0, "box-shadow", value.str());
            0
        }
        12 => {
            // A semantic transition; there is no raw CSS or string escape hatch.
            let Some(property) = PROPERTIES.get(a as usize) else { return DENIED; };
            if len != 5 || b > 30_000 { return DENIED; }
            let delay = u32::from_le_bytes(bytes[..4].try_into().unwrap());
            let Some(easing) = ["linear", "ease-in", "ease-out", "ease-in-out"]
                .get(bytes[4] as usize) else { return DENIED; };
            if delay > 30_000 { return DENIED; }
            let mut value = Text::new();
            if write!(value, "{} {}ms {} {}ms", property, b, easing, delay).is_err()
                { return DENIED; }
            send(2, id, 0, "transition", value.str());
            0
        }
        _ => DENIED,
    }
}
