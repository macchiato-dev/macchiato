use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

/// Creates an async closure whose first capture is its private self cell.
pub fn capture_recursive_async_stack(
    arena: &mut Arena<'_>,
    entry: u32,
    capture_count: usize,
) -> Result<Value, Error> {
    if capture_count > arena.stack_len() {
        return Err(Error::StackUnderflow);
    }
    let cell = microesnext_environments::new(arena, Value::UNDEFINED)?;
    let insertion = arena.stack_len() - capture_count;
    arena.insert_stack_value_from_bottom(insertion, cell)?;
    let closure = crate::async_functions::capture_stack(arena, entry, capture_count + 1)?;
    let moved_cell = crate::async_functions::capture(arena, closure, 0)?;
    microesnext_environments::set(arena, moved_cell, closure)?;
    Ok(closure)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn private_self_cell_survives_compaction() {
        let mut memory = [0; 40];
        let mut arena = Arena::new(&mut memory);
        let closure = capture_recursive_async_stack(&mut arena, 17, 0).unwrap();
        arena.push(closure).unwrap();
        arena.compact(&mut []).unwrap();
        let moved = arena.stack_value(0).unwrap();
        let cell = crate::async_functions::capture(&arena, moved, 0).unwrap();
        assert_eq!(microesnext_environments::get(&arena, cell), Ok(moved));
    }
}
