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
