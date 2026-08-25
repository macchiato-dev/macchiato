#![no_std]

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};

/// Concatenate two strings without allocating a temporary Rust buffer.
pub fn concatenate(arena: &mut Arena<'_>, left: Value, right: Value) -> Result<Value, Error> {
    let left = left.as_ref().ok_or(Error::Type)?;
    let right = right.as_ref().ok_or(Error::Type)?;
    if arena.kind(left)? != BlockKind::String || arena.kind(right)? != BlockKind::String {
        return Err(Error::Type);
    }
    arena
        .concatenate_bytes(BlockKind::String, left, right, &mut [])
        .map(Value::from_ref)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn concatenates_directly_in_the_guest_arena() {
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        let left = microesnext_arena::Arena::allocate_bytes(
            &mut arena,
            BlockKind::String,
            b"micro",
            &mut [],
        )
        .map(Value::from_ref)
        .unwrap();
        let right = microesnext_arena::Arena::allocate_bytes(
            &mut arena,
            BlockKind::String,
            b"esnext",
            &mut [],
        )
        .map(Value::from_ref)
        .unwrap();
        let joined = concatenate(&mut arena, left, right)
            .unwrap()
            .as_ref()
            .unwrap();
        assert!(arena.bytes_equal(joined, b"microesnext").unwrap());
    }
}
