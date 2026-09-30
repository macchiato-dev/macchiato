#![no_std]
// The only module permitted to import browser operations. Guest pointers are
// never dereferenced here: the JS bridge copies into this fixed inbox first.
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

#[link(wasm_import_module = "browser")]
extern "C" {
    fn emit(op: u32, id: u32, arg: u32, p: *const u8, n: usize,
            q: *const u8, m: usize);
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
    unsafe { emit(op, id, arg, name.as_ptr(), name.len(), value.as_ptr(), value.len()); }
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
    // The bridge invokes us synchronously and doesn't re-enter on emit().
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
