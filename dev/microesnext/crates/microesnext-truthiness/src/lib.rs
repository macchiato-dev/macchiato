#![no_std]

use microesnext_arena::Arena;
#[cfg(feature = "strings")]
use microesnext_arena::BlockKind;
use microesnext_types::{Error, Value};

/// Apply ECMAScript ToBoolean without requiring object, string, or number
/// storage in builds where those value kinds cannot exist.
#[inline(always)]
pub fn to_boolean(arena: &Arena<'_>, value: Value) -> Result<bool, Error> {
    if value == Value::UNDEFINED || value == Value::NULL || value == Value::FALSE {
        return Ok(false);
    }
    if value == Value::TRUE {
        return Ok(true);
    }
    if let Some(integer) = value.as_i30() {
        return Ok(integer != 0);
    }
    let reference = value.as_ref().ok_or(Error::Type)?;
    #[cfg(feature = "numbers")]
    if let Some(number) = microesnext_numbers::try_get(arena, value)? {
        return Ok(number != 0.0 && !number.is_nan());
    }
    #[cfg(feature = "strings")]
    if arena.kind(reference)? == BlockKind::String {
        return Ok(arena.byte_len(reference)? != 0);
    }
    let _ = arena.kind(reference)?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn coerces_invariant_values_without_optional_storage() {
        let mut memory = [0; 16];
        let arena = Arena::new(&mut memory);
        for value in [Value::UNDEFINED, Value::NULL, Value::FALSE] {
            assert_eq!(to_boolean(&arena, value), Ok(false));
        }
        assert_eq!(to_boolean(&arena, Value::from_i30(0).unwrap()), Ok(false));
        assert_eq!(to_boolean(&arena, Value::TRUE), Ok(true));
        assert_eq!(to_boolean(&arena, Value::from_i30(-1).unwrap()), Ok(true));
    }

    #[cfg(feature = "numbers")]
    #[test]
    fn coerces_boxed_numbers() {
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        for number in [-0.0, f64::NAN] {
            let value = microesnext_numbers::new(&mut arena, number).unwrap();
            assert_eq!(to_boolean(&arena, value), Ok(false));
        }
        let value = microesnext_numbers::new(&mut arena, 0.5).unwrap();
        assert_eq!(to_boolean(&arena, value), Ok(true));
    }

    #[cfg(feature = "strings")]
    #[test]
    fn coerces_strings_by_length() {
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        let empty = arena
            .allocate_bytes(BlockKind::String, b"", &mut [])
            .unwrap();
        let text = arena
            .allocate_bytes(BlockKind::String, b"x", &mut [])
            .unwrap();
        assert_eq!(to_boolean(&arena, Value::from_ref(empty)), Ok(false));
        assert_eq!(to_boolean(&arena, Value::from_ref(text)), Ok(true));
    }
}
