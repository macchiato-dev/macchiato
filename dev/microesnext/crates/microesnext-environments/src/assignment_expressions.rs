use microesnext_arena::Arena;
use microesnext_types::Error;

/// Store through an environment cell while retaining the assigned value.
///
/// The input stack ends in `[cell, value]`; the output ends in `[value]`.
/// Keeping this operation separate avoids adding a preserving branch to the
/// ordinary environment store used by assignment statements.
#[inline(always)]
pub fn store_result(arena: &mut Arena<'_>) -> Result<(), Error> {
    let value = arena.pop()?;
    let cell = arena.pop()?;
    crate::set(arena, cell, value)?;
    arena.push(value)
}

#[cfg(test)]
mod tests {
    use microesnext_types::Value;

    use super::*;

    #[test]
    fn updates_the_cell_and_retains_the_value() {
        let mut memory = [0; 24];
        let mut arena = Arena::new(&mut memory);
        let cell = crate::new(&mut arena, Value::UNDEFINED).unwrap();
        let value = Value::from_i30(42).unwrap();
        arena.push(cell).unwrap();
        arena.push(value).unwrap();

        store_result(&mut arena).unwrap();

        assert_eq!(arena.pop(), Ok(value));
        assert_eq!(crate::get(&arena, cell), Ok(value));
    }
}
