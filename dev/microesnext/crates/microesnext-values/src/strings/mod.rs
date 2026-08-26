pub mod atoms;
pub mod operations;

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};

/// Allocate an ordinary, unrooted guest string. The caller decides its
/// lifetime just like any other guest value; atom retention is a separate
/// capability.
pub fn new(arena: &mut Arena<'_>, bytes: &[u8]) -> Result<Value, Error> {
    arena
        .allocate_bytes(BlockKind::String, bytes, &mut [])
        .map(Value::from_ref)
}

/// Converts the primitive values needed by template literals without `alloc`.
pub fn from_primitive(arena: &mut Arena<'_>, value: Value) -> Result<Value, Error> {
    if let Some(reference) = value.as_ref() {
        return (arena.kind(reference)? == BlockKind::String)
            .then_some(value)
            .ok_or(Error::Type);
    }
    if let Some(integer) = value.as_i30() {
        let mut digits = [0_u8; 11];
        let negative = integer < 0;
        let mut magnitude = i64::from(integer).unsigned_abs();
        let mut start = digits.len();
        loop {
            start -= 1;
            digits[start] = b'0' + (magnitude % 10) as u8;
            magnitude /= 10;
            if magnitude == 0 {
                break;
            }
        }
        if negative {
            start -= 1;
            digits[start] = b'-';
        }
        return new(arena, &digits[start..]);
    }
    let bytes: &[u8] = if value == Value::UNDEFINED {
        b"undefined"
    } else if value == Value::NULL {
        b"null"
    } else if value == Value::TRUE {
        b"true"
    } else if value == Value::FALSE {
        b"false"
    } else {
        return Err(Error::Type);
    };
    new(arena, bytes)
}

#[cfg(test)]
mod tests {
    use microesnext_arena::Arena;

    use super::new;

    #[test]
    fn ordinary_strings_relocate_without_an_atom_table() {
        let mut memory = [0; 24];
        let mut arena = Arena::with_root_capacity(&mut memory, 1);
        let string = new(&mut arena, b"title").unwrap();
        let root = arena.retain(string).unwrap();
        arena.compact(&mut []).unwrap();
        let string = arena.root(root).unwrap().as_ref().unwrap();
        assert!(arena.bytes_equal(string, b"title").unwrap());
    }
}
