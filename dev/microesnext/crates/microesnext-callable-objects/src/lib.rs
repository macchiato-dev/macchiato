#![no_std]

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};

/// Wrap a compact closure in an ordinary object without changing the closure.
pub fn new(arena: &mut Arena<'_>, callable: Value, prototype: Value) -> Result<Value, Error> {
    if !microesnext_functions::is_function(arena, callable)
        || (prototype != Value::NULL && !microesnext_objects::is_object(arena, prototype))
    {
        return Err(Error::Type);
    }
    let mut live = [callable, prototype];
    let properties = arena.allocate_values(BlockKind::Properties, &mut [], &mut live)?;
    let mut fields = [live[1], Value::from_ref(properties), live[0]];
    let object = arena.allocate_values(BlockKind::CallableObject, &mut fields, &mut [])?;
    Ok(Value::from_ref(object))
}

/// Return the compact closure stored in a callable object.
pub fn callable(arena: &Arena<'_>, object: Value) -> Result<Value, Error> {
    let object = object.as_ref().ok_or(Error::Type)?;
    if arena.kind(object)? != BlockKind::CallableObject {
        return Err(Error::Type);
    }
    arena
        .values(object)?
        .get(2)
        .copied()
        .map(Value::from_raw)
        .ok_or(Error::DanglingReference)
}

pub fn is_callable_object(arena: &Arena<'_>, value: Value) -> bool {
    value
        .as_ref()
        .and_then(|reference| arena.kind(reference).ok())
        == Some(BlockKind::CallableObject)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn composes_object_properties_and_prototypes_with_a_compact_closure() {
        let mut memory = [0; 160];
        let mut arena = Arena::with_root_capacity(&mut memory, 2);
        let prototype = microesnext_objects::new_object(&mut arena, Value::NULL).unwrap();
        let closure = microesnext_functions::capture_stack(&mut arena, 12, 0).unwrap();
        let object = new(&mut arena, closure, prototype).unwrap();

        assert!(is_callable_object(&arena, object));
        assert!(microesnext_objects::is_object(&arena, object));
        assert_eq!(
            microesnext_objects::prototype(&arena, object),
            Ok(prototype)
        );
        assert_eq!(callable(&arena, object), Ok(closure));

        let key = Value::from_i30(7).unwrap();
        let object = microesnext_objects::set(&mut arena, object, key, Value::TRUE).unwrap();
        let object_root = arena.retain(object).unwrap();
        let prototype_root = arena.retain(prototype).unwrap();
        arena.compact(&mut []).unwrap();
        let object = arena.root(object_root).unwrap();
        let prototype = arena.root(prototype_root).unwrap();
        assert_eq!(
            microesnext_objects::get(&arena, object, key),
            Ok(Value::TRUE)
        );
        assert_eq!(
            microesnext_objects::prototype(&arena, object),
            Ok(prototype)
        );
        assert!(microesnext_functions::is_function(
            &arena,
            callable(&arena, object).unwrap()
        ));
    }

    #[test]
    fn rejects_non_closures_and_non_object_prototypes() {
        let mut memory = [0; 48];
        let mut arena = Arena::new(&mut memory);
        let closure = microesnext_functions::capture_stack(&mut arena, 0, 0).unwrap();

        assert_eq!(new(&mut arena, Value::TRUE, Value::NULL), Err(Error::Type));
        assert_eq!(new(&mut arena, closure, Value::TRUE), Err(Error::Type));
    }
}
