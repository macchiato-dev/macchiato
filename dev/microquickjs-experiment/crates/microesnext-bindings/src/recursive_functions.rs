use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

/// Creates a closure whose first capture is a cell containing the closure.
pub fn capture_recursive_stack(
    arena: &mut Arena<'_>,
    entry: u32,
    capture_count: usize,
) -> Result<Value, Error> {
    if capture_count > arena.stack_len() {
        return Err(Error::StackUnderflow);
    }
    let cell = crate::environments::new(arena, Value::UNDEFINED)?;
    let insertion = arena.stack_len() - capture_count;
    arena.insert_stack_value_from_bottom(insertion, cell)?;
    let closure = microesnext_arena::closures::capture_stack(arena, entry, capture_count + 1)?;
    let moved_cell = microesnext_arena::closures::capture(arena, closure, 0)?;
    crate::environments::set(arena, moved_cell, closure)?;
    Ok(closure)
}
