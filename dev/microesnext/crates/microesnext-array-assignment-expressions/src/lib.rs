#![no_std]

use microesnext_arena::Arena;
use microesnext_types::Error;

/// Store an array element while retaining the assigned value.
///
/// The input stack ends in `[array, index, value]`; the output ends in
/// `[value]`. Literal construction keeps using its smaller object-preserving
/// store and does not acquire this expression behavior.
#[inline(always)]
pub fn store_result(arena: &mut Arena<'_>) -> Result<(), Error> {
    let value = arena.pop()?;
    let index = arena
        .pop()?
        .as_i30()
        .and_then(|index| usize::try_from(index).ok())
        .ok_or(Error::Type)?;
    let array = arena.pop()?;
    microesnext_arrays::set(arena, array, index, value)?;
    arena.push(value)
}

#[cfg(test)]
mod tests {
    use microesnext_types::Value;

    use super::*;

    #[test]
    fn updates_the_index_and_retains_the_value() {
        let mut memory = [0; 128];
        let mut arena = Arena::new(&mut memory);
        let array = microesnext_arrays::new(&mut arena).unwrap();
        let index = Value::from_i30(3).unwrap();
        let value = Value::from_i30(42).unwrap();
        arena.push(array).unwrap();
        arena.push(index).unwrap();
        arena.push(value).unwrap();

        store_result(&mut arena).unwrap();

        assert_eq!(arena.pop(), Ok(value));
        assert_eq!(microesnext_arrays::get(&arena, array, 3), Ok(value));
    }
}
