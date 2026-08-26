use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};

/// Create a class constructor and its instance-prototype cycle.
pub fn new(
    arena: &mut Arena<'_>,
    callable: Value,
    function_prototype: Value,
    object_prototype: Value,
    prototype_key: Value,
    constructor_key: Value,
) -> Result<Value, Error> {
    if !microesnext_arena::closures::is_function(arena, callable)
        || (function_prototype != Value::NULL && !crate::is_object(arena, function_prototype))
        || (object_prototype != Value::NULL && !crate::is_object(arena, object_prototype))
    {
        return Err(Error::Type);
    }

    let mut roots = [
        callable,
        function_prototype,
        object_prototype,
        prototype_key,
        constructor_key,
        Value::UNDEFINED,
        Value::UNDEFINED,
        Value::UNDEFINED,
    ];
    let properties = arena.allocate_values(
        BlockKind::Properties,
        &mut [roots[3], Value::UNDEFINED],
        &mut roots,
    )?;
    roots[5] = Value::from_ref(properties);
    let constructor = arena.allocate_values(
        BlockKind::ClassConstructor,
        &mut [roots[1], roots[5], roots[0]],
        &mut roots,
    )?;
    roots[6] = Value::from_ref(constructor);
    let properties =
        arena.allocate_values(BlockKind::Properties, &mut [roots[4], roots[6]], &mut roots)?;
    roots[7] = Value::from_ref(properties);
    let instance_prototype =
        arena.allocate_values(BlockKind::Object, &mut [roots[2], roots[7]], &mut roots)?;
    arena.set_value(
        roots[5].as_ref().ok_or(Error::DanglingReference)?,
        1,
        Value::from_ref(instance_prototype),
    )?;
    Ok(roots[6])
}

/// Return the compact closure stored in a class constructor.
pub fn callable(arena: &Arena<'_>, constructor: Value) -> Result<Value, Error> {
    let constructor = constructor.as_ref().ok_or(Error::Type)?;
    if arena.kind(constructor)? != BlockKind::ClassConstructor {
        return Err(Error::Type);
    }
    arena
        .values(constructor)?
        .get(2)
        .copied()
        .map(Value::from_raw)
        .ok_or(Error::DanglingReference)
}

pub fn is_class_constructor(arena: &Arena<'_>, value: Value) -> bool {
    value
        .as_ref()
        .and_then(|reference| arena.kind(reference).ok())
        == Some(BlockKind::ClassConstructor)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_a_distinct_constructor_with_a_prototype_cycle() {
        let mut memory = [0; 192];
        let mut arena = Arena::with_root_capacity(&mut memory, 1);
        let closure = microesnext_arena::closures::capture_stack(&mut arena, 0, 0).unwrap();
        let prototype_key = Value::from_i30(1).unwrap();
        let constructor_key = Value::from_i30(2).unwrap();
        let constructor = new(
            &mut arena,
            closure,
            Value::NULL,
            Value::NULL,
            prototype_key,
            constructor_key,
        )
        .unwrap();
        let root = arena.retain(constructor).unwrap();
        arena.compact(&mut []).unwrap();
        let constructor = arena.root(root).unwrap();
        let prototype = crate::get(&arena, constructor, prototype_key).unwrap();

        assert!(is_class_constructor(&arena, constructor));
        assert!(crate::is_object(&arena, constructor));
        assert!(crate::is_object(&arena, prototype));
        assert_eq!(
            crate::get(&arena, prototype, constructor_key),
            Ok(constructor)
        );
        assert_eq!(callable(&arena, constructor), Ok(closure));
    }
}
