#![no_std]

use microesnext_arena::Arena;
use microesnext_types::Error;

/// Store an object property while retaining the assigned value.
///
/// The input stack ends in `[object, key, value]`; the output ends in
/// `[value]`. Keeping this operation separate leaves object-literal and
/// assignment-statement stores as small as before.
#[inline(always)]
pub fn store_result(arena: &mut Arena<'_>) -> Result<(), Error> {
    let value = arena.pop()?;
    let key = arena.pop()?;
    let object = arena.pop()?;
    microesnext_objects::set(arena, object, key, value)?;
    arena.push(value)
}

#[cfg(test)]
mod tests {
    use microesnext_atoms::Atoms;
    use microesnext_types::Value;

    use super::*;

    #[test]
    fn updates_the_property_and_retains_the_value() {
        let mut memory = [0; 512];
        let mut arena = Arena::with_root_capacity(&mut memory, 4);
        let mut atoms = Atoms::new(&mut arena).unwrap();
        let object = microesnext_objects::new_object(&mut arena, Value::NULL).unwrap();
        let key = atoms.intern(&mut arena, b"answer").unwrap();
        let value = Value::from_i30(42).unwrap();
        arena.push(object).unwrap();
        arena.push(key).unwrap();
        arena.push(value).unwrap();

        store_result(&mut arena).unwrap();

        assert_eq!(arena.pop(), Ok(value));
        assert_eq!(microesnext_objects::get(&arena, object, key), Ok(value));
    }
}
