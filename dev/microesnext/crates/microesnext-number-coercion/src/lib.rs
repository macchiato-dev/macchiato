#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

/// Apply the allocation-free portion of JavaScript `ToNumber`.
///
/// String parsing and object `ToPrimitive` are separate compositions; values
/// requiring either are rejected rather than silently receiving host rules.
pub fn to_number(arena: &mut Arena<'_>, value: Value) -> Result<Value, Error> {
    if value.as_i30().is_some() {
        return Ok(value);
    }
    match value {
        Value::UNDEFINED => microesnext_numbers::new(arena, f64::NAN),
        Value::NULL | Value::FALSE => Ok(Value::from_i30(0).unwrap()),
        Value::TRUE => Ok(Value::from_i30(1).unwrap()),
        _ => {
            microesnext_numbers::get(arena, value)?;
            Ok(value)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn coerces_immediate_primitives_and_preserves_numbers() {
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        assert_eq!(
            to_number(&mut arena, Value::NULL).unwrap().as_i30(),
            Some(0)
        );
        assert_eq!(
            to_number(&mut arena, Value::FALSE).unwrap().as_i30(),
            Some(0)
        );
        assert_eq!(
            to_number(&mut arena, Value::TRUE).unwrap().as_i30(),
            Some(1)
        );
        let undefined = to_number(&mut arena, Value::UNDEFINED).unwrap();
        assert!(
            microesnext_numbers::get(&arena, undefined)
                .unwrap()
                .is_nan()
        );
        let fraction = microesnext_numbers::new(&mut arena, 1.25).unwrap();
        assert_eq!(to_number(&mut arena, fraction), Ok(fraction));
    }
}
