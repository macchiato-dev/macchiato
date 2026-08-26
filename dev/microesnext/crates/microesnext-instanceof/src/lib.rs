#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

/// Apply ordinary `instanceof` after the realm supplies its `prototype` key.
///
/// `Symbol.hasInstance` dispatch is deliberately a higher, separately
/// removable composition. This path performs no allocation.
pub fn ordinary(
    arena: &Arena<'_>,
    value: Value,
    constructor: Value,
    prototype_key: Value,
) -> Result<bool, Error> {
    if !is_constructor(arena, constructor) {
        return Err(Error::Type);
    }
    let prototype = microesnext_objects::get(arena, constructor, prototype_key)?;
    microesnext_prototype_chain::contains(arena, value, prototype)
}

#[cfg(not(feature = "class-constructors"))]
fn is_constructor(arena: &Arena<'_>, constructor: Value) -> bool {
    microesnext_callable_objects::is_callable_object(arena, constructor)
}

#[cfg(feature = "class-constructors")]
fn is_constructor(arena: &Arena<'_>, constructor: Value) -> bool {
    microesnext_callable_objects::is_callable_object(arena, constructor)
        || microesnext_class_constructors::is_class_constructor(arena, constructor)
}

#[cfg(test)]
mod tests {
    use microesnext_arena::closures::capture_stack;
    use microesnext_objects::{new_object, set};

    use super::*;

    #[test]
    fn tests_a_callable_objects_prototype_property() {
        let mut memory = [0; 192];
        let mut arena = Arena::new(&mut memory);
        let key = Value::from_i30(1).unwrap();
        let prototype = new_object(&mut arena, Value::NULL).unwrap();
        let instance = new_object(&mut arena, prototype).unwrap();
        let closure = capture_stack(&mut arena, 0, 0).unwrap();
        let constructor =
            microesnext_callable_objects::new(&mut arena, closure, Value::NULL).unwrap();
        let constructor = set(&mut arena, constructor, key, prototype).unwrap();

        assert_eq!(ordinary(&arena, instance, constructor, key), Ok(true));
        assert_eq!(ordinary(&arena, prototype, constructor, key), Ok(false));
        assert_eq!(ordinary(&arena, Value::TRUE, constructor, key), Ok(false));
    }

    #[test]
    fn rejects_non_callable_rhs_and_non_object_prototype_properties() {
        let mut memory = [0; 128];
        let mut arena = Arena::new(&mut memory);
        let key = Value::from_i30(1).unwrap();
        let value = new_object(&mut arena, Value::NULL).unwrap();
        let closure = capture_stack(&mut arena, 0, 0).unwrap();
        let constructor =
            microesnext_callable_objects::new(&mut arena, closure, Value::NULL).unwrap();
        let constructor = set(&mut arena, constructor, key, Value::TRUE).unwrap();

        assert_eq!(ordinary(&arena, value, Value::TRUE, key), Err(Error::Type));
        assert_eq!(ordinary(&arena, value, constructor, key), Err(Error::Type));
    }
}
