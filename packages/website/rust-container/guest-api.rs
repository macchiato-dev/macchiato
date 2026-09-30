// App-side convenience only. The sandbox validates everything independently.
#[link(wasm_import_module = "sandbox")]
extern "C" {
    fn call(op: u32, id: u32, a: u32, b: u32, p: *const u8, n: usize) -> u32;
}
fn request(op: u32, id: u32, a: u32, b: u32, bytes: &[u8]) -> u32 {
    let result = unsafe { call(op, id, a, b, bytes.as_ptr(), bytes.len()) };
    assert_ne!(result, u32::MAX, "Sandbox rejected operation");
    result
}
pub fn node(parent: u32, tag: u32) -> u32 { request(0, parent, tag, 0, &[]) }
pub fn text(id: u32, value: &str) { request(1, id, 0, 0, value.as_bytes()); }
pub fn number(id: u32, prop: u32, value: i32, unit: u8) {
    request(2, id, prop, value as u32, &[unit]);
}
pub fn keyword(id: u32, prop: u32, word: u32) { request(3, id, prop, word, &[]); }
pub fn color(id: u32, prop: u32, rgba: u32) { request(4, id, prop, rgba, &[]); }
pub fn attr(id: u32, name: u32, value: &str) { request(5, id, name, 0, value.as_bytes()); }
pub fn hidden(id: u32, value: bool) { request(6, id, value as u32, 0, &[]); }
pub fn remove(id: u32) { request(7, id, 0, 0, &[]); }
pub fn click(id: u32, token: u32) { request(8, id, token, 0, &[]); }
pub fn png(bytes: &[u8]) -> u32 { request(9, 0, 0, 0, bytes) }
pub fn image(id: u32, resource: u32) { request(10, id, resource, 0, &[]); }
pub fn shadows(id: u32, unit: u32, records: &[[i32; 5]]) {
    let mut bytes = [0; 80];
    assert!(records.len() <= 4);
    for (i, record) in records.iter().enumerate() {
        for (j, value) in record.iter().enumerate() {
            let at = i * 20 + j * 4;
            bytes[at..at+4].copy_from_slice(&value.to_le_bytes());
        }
    }
    request(11, id, unit, 0, &bytes[..records.len()*20]);
}
pub fn transition(id: u32, prop: u32, duration: u32, delay: u32, easing: u8) {
    let mut bytes = [0; 5];
    bytes[..4].copy_from_slice(&delay.to_le_bytes()); bytes[4] = easing;
    request(12, id, prop, duration, &bytes);
}
