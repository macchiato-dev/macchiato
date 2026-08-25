#![no_std]

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};

/// Create an ordinary receiver from a constructor's current `prototype`.
///
/// The constructor remains a mutable allocation root while the receiver is
/// created, so the returned compact callable survives arena compaction.
pub fn prepare(
    arena: &mut Arena<'_>,
    constructor: Value,
    prototype_key: Value,
) -> Result<(Value, Value), Error> {
    if !microesnext_callable_objects::is_callable_object(arena, constructor) {
        return Err(Error::Type);
    }
    let prototype = microesnext_objects::get(arena, constructor, prototype_key)?;
    if !microesnext_objects::is_object(arena, prototype) {
        return Err(Error::Type);
    }

    let mut roots = [constructor, prototype];
    let properties = arena.allocate_values(BlockKind::Properties, &mut [], &mut roots)?;
    let receiver = arena.allocate_values(
        BlockKind::Object,
        &mut [roots[1], Value::from_ref(properties)],
        &mut roots,
    )?;
    let callable = microesnext_callable_objects::callable(arena, roots[0])?;
    Ok((callable, Value::from_ref(receiver)))
}

/// Apply the ordinary constructor return rule without allocating.
pub fn select(arena: &Arena<'_>, receiver: Value, returned: Value) -> Value {
    if microesnext_objects::is_object(arena, returned) {
        returned
    } else {
        receiver
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_a_receiver_and_selects_the_ordinary_result() {
        let mut memory = [0; 224];
        let mut arena = Arena::new(&mut memory);
        let closure = microesnext_functions::capture_stack(&mut arena, 0, 0).unwrap();
        let prototype_key = Value::from_i30(1).unwrap();
        let constructor_key = Value::from_i30(2).unwrap();
        let constructor = microesnext_callable_objects::new_constructor(
            &mut arena,
            closure,
            Value::NULL,
            Value::NULL,
            prototype_key,
            constructor_key,
        )
        .unwrap();
        let (callable, receiver) = prepare(&mut arena, constructor, prototype_key).unwrap();
        let prototype = microesnext_objects::get(&arena, constructor, prototype_key).unwrap();

        assert!(microesnext_functions::is_function(&arena, callable));
        assert_eq!(microesnext_objects::prototype(&arena, receiver), Ok(prototype));
        assert_eq!(select(&arena, receiver, Value::UNDEFINED), receiver);
        assert_eq!(select(&arena, receiver, prototype), prototype);
    }
}
