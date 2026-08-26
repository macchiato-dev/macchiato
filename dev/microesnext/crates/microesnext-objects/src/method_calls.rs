use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

/// Resolve a property while preserving its receiver immediately below it.
pub fn load(arena: &mut Arena<'_>, receiver: Value, key: Value) -> Result<(), Error> {
    let method = crate::get(arena, receiver, key)?;
    arena.push(receiver)?;
    arena.push(method)
}

/// Remove a method and its preserved receiver from below evaluated arguments.
pub fn take(arena: &mut Arena<'_>, argument_count: usize) -> Result<(Value, Value), Error> {
    let method = microesnext_bindings::parameters::take_callable(arena, argument_count)?;
    let receiver_index = arena
        .stack_len()
        .checked_sub(argument_count + 1)
        .ok_or(Error::StackUnderflow)?;
    let receiver = arena.remove_stack_value_from_bottom(receiver_index)?;
    Ok((method, receiver))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn preserves_a_receiver_only_until_the_method_call() {
        let mut memory = [0; 64];
        let mut arena = Arena::new(&mut memory);
        let key = Value::from_i30(1).unwrap();
        let receiver = crate::new_object(&mut arena, Value::NULL).unwrap();
        let receiver = crate::set(&mut arena, receiver, key, Value::TRUE).unwrap();

        load(&mut arena, receiver, key).unwrap();
        arena.push(Value::from_i30(42).unwrap()).unwrap();
        assert_eq!(take(&mut arena, 1), Ok((Value::TRUE, receiver)));
        assert_eq!(arena.stack_len(), 1);
        assert_eq!(arena.pop().unwrap().as_i30(), Some(42));
    }
}
