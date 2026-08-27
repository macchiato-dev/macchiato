use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};

/// Wrap a compact closure in an ordinary object without changing the closure.
pub fn new(arena: &mut Arena<'_>, callable: Value, prototype: Value) -> Result<Value, Error> {
    if !microesnext_arena::closures::is_function(arena, callable)
        || (prototype != Value::NULL && !crate::is_object(arena, prototype))
    {
        return Err(Error::Type);
    }
    let mut live = [callable, prototype];
    let properties = arena.allocate_values(BlockKind::Properties, &mut [], &mut live)?;
    let mut fields = [live[1], Value::from_ref(properties), live[0]];
    let object = arena.allocate_values(BlockKind::CallableObject, &mut fields, &mut [])?;
    Ok(Value::from_ref(object))
}

/// Create an ordinary constructible function and its `.prototype` cycle.
///
/// The caller supplies realm-interned property keys. All live values stay in
/// one mutable root group, so compaction during any allocation updates them
/// without permanent root slots.
pub fn new_constructor(
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
    let function = arena.allocate_values(
        BlockKind::CallableObject,
        &mut [roots[1], roots[5], roots[0]],
        &mut roots,
    )?;
    roots[6] = Value::from_ref(function);
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

/// Bind a callable to a receiver and an optional leading argument array.
#[cfg(feature = "arrays")]
pub fn bind(
    arena: &mut Arena<'_>,
    callable: Value,
    receiver: Value,
    arguments: Value,
) -> Result<Value, Error> {
    let callable = if is_callable_object(arena, callable) {
        self::callable(arena, callable)?
    } else {
        callable
    };
    if !microesnext_arena::closures::is_function(arena, callable)
        || !crate::arrays::is_array(arena, arguments)
    {
        return Err(Error::Type);
    }
    let mut fields = [callable, receiver, arguments];
    let reference = arena.allocate_values(BlockKind::BoundCallable, &mut fields, &mut [])?;
    Ok(Value::from_ref(reference))
}

pub fn is_bound(arena: &Arena<'_>, value: Value) -> bool {
    value.as_ref().and_then(|reference| arena.kind(reference).ok())
        == Some(BlockKind::BoundCallable)
}

pub fn bound_parts(arena: &Arena<'_>, value: Value) -> Result<(Value, Value, Value), Error> {
    let reference = value.as_ref().ok_or(Error::Type)?;
    if arena.kind(reference)? != BlockKind::BoundCallable { return Err(Error::Type); }
    let values = arena.values(reference)?;
    if values.len() != 3 { return Err(Error::DanglingReference); }
    Ok((Value::from_raw(values[0]), Value::from_raw(values[1]), Value::from_raw(values[2])))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn composes_object_properties_and_prototypes_with_a_compact_closure() {
        let mut memory = [0; 160];
        let mut arena = Arena::with_root_capacity(&mut memory, 2);
        let prototype = crate::new_object(&mut arena, Value::NULL).unwrap();
        let closure = microesnext_arena::closures::capture_stack(&mut arena, 12, 0).unwrap();
        let object = new(&mut arena, closure, prototype).unwrap();

        assert!(is_callable_object(&arena, object));
        assert!(crate::is_object(&arena, object));
        assert_eq!(crate::prototype(&arena, object), Ok(prototype));
        assert_eq!(callable(&arena, object), Ok(closure));

        let key = Value::from_i30(7).unwrap();
        let object = crate::set(&mut arena, object, key, Value::TRUE).unwrap();
        let object_root = arena.retain(object).unwrap();
        let prototype_root = arena.retain(prototype).unwrap();
        arena.compact(&mut []).unwrap();
        let object = arena.root(object_root).unwrap();
        let prototype = arena.root(prototype_root).unwrap();
        assert_eq!(crate::get(&arena, object, key), Ok(Value::TRUE));
        assert_eq!(crate::prototype(&arena, object), Ok(prototype));
        assert!(microesnext_arena::closures::is_function(
            &arena,
            callable(&arena, object).unwrap()
        ));
    }

    #[test]
    fn rejects_non_closures_and_non_object_prototypes() {
        let mut memory = [0; 48];
        let mut arena = Arena::new(&mut memory);
        let closure = microesnext_arena::closures::capture_stack(&mut arena, 0, 0).unwrap();

        assert_eq!(new(&mut arena, Value::TRUE, Value::NULL), Err(Error::Type));
        assert_eq!(new(&mut arena, closure, Value::TRUE), Err(Error::Type));
    }

    #[test]
    fn creates_the_constructor_and_prototype_cycle() {
        let mut memory = [0; 192];
        let mut arena = Arena::with_root_capacity(&mut memory, 1);
        let closure = microesnext_arena::closures::capture_stack(&mut arena, 0, 0).unwrap();
        let prototype_key = Value::from_i30(1).unwrap();
        let constructor_key = Value::from_i30(2).unwrap();
        let function = new_constructor(
            &mut arena,
            closure,
            Value::NULL,
            Value::NULL,
            prototype_key,
            constructor_key,
        )
        .unwrap();
        let root = arena.retain(function).unwrap();
        arena.compact(&mut []).unwrap();
        let function = arena.root(root).unwrap();
        let prototype = crate::get(&arena, function, prototype_key).unwrap();

        assert!(crate::is_object(&arena, prototype));
        assert_eq!(crate::get(&arena, prototype, constructor_key), Ok(function));
        assert!(microesnext_arena::closures::is_function(
            &arena,
            callable(&arena, function).unwrap()
        ));
    }
}
