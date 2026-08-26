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

    #[test]
    fn roots_both_inputs_when_concatenation_compacts() {
        let mut memory = [0; 24];
        let mut arena = Arena::new(&mut memory);
        arena
            .allocate_bytes(BlockKind::String, b"discarded allocation", &mut [])
            .unwrap();
        let left = arena
            .allocate_bytes(BlockKind::String, b"left", &mut [])
            .map(Value::from_ref)
            .unwrap();
        let right = arena
            .allocate_bytes(BlockKind::String, b"right", &mut [])
            .map(Value::from_ref)
            .unwrap();

        let joined = concatenate(&mut arena, left, right)
            .unwrap()
            .as_ref()
            .unwrap();
        assert!(arena.bytes_equal(joined, b"leftright").unwrap());
    }

    #[test]
    fn rejects_non_string_values() {
        let mut memory = [0; 16];
        let mut arena = Arena::new(&mut memory);
        let string = arena
            .allocate_bytes(BlockKind::String, b"value", &mut [])
            .map(Value::from_ref)
            .unwrap();
        assert_eq!(
            concatenate(&mut arena, Value::TRUE, string),
            Err(Error::Type)
        );
    }
}
