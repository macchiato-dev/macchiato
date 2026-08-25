#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

/// Test whether `prototype` occurs in an ordinary object's prototype chain.
///
/// This is the allocation-free core shared by `instanceof` and
/// `Object.prototype.isPrototypeOf`. Callable validation and retrieval of a
/// constructor's `prototype` property belong to the higher-level operation.
pub fn contains(arena: &Arena<'_>, value: Value, prototype: Value) -> Result<bool, Error> {
    if !microesnext_objects::is_object(arena, prototype) {
        return Err(Error::Type);
    }
    if !microesnext_objects::is_object(arena, value) {
        return Ok(false);
    }

    let mut current = microesnext_objects::prototype(arena, value)?;
    while current != Value::NULL {
        if current == prototype {
            return Ok(true);
        }
        current = microesnext_objects::prototype(arena, current)?;
    }
    Ok(false)
}

#[cfg(test)]
mod tests {
    use microesnext_objects::new_object;

    use super::*;

    #[test]
    fn walks_an_ordinary_chain_without_allocation() {
        let mut memory = [0; 96];
        let mut arena = Arena::new(&mut memory);
        let root = new_object(&mut arena, Value::NULL).unwrap();
        let parent = new_object(&mut arena, root).unwrap();
        let child = new_object(&mut arena, parent).unwrap();
        let unrelated = new_object(&mut arena, Value::NULL).unwrap();

        assert_eq!(contains(&arena, child, parent), Ok(true));
        assert_eq!(contains(&arena, child, root), Ok(true));
        assert_eq!(contains(&arena, child, child), Ok(false));
        assert_eq!(contains(&arena, child, unrelated), Ok(false));
    }

    #[test]
    fn rejects_a_non_object_prototype_but_not_a_primitive_value() {
        let mut memory = [0; 24];
        let mut arena = Arena::new(&mut memory);
        let prototype = new_object(&mut arena, Value::NULL).unwrap();

        assert_eq!(contains(&arena, Value::TRUE, prototype), Ok(false));
        assert_eq!(contains(&arena, prototype, Value::TRUE), Err(Error::Type));
    }
}
