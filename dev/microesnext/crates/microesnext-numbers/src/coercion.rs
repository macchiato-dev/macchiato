use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

/// Numeric result before a boxed IEEE-754 value is materialized.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum PrimitiveNumber {
    I30(i32),
    F64(f64),
}

/// Coerce a primitive while retaining the immediate-integer fast path.
#[inline]
pub fn coerce(arena: &Arena<'_>, value: Value) -> Result<PrimitiveNumber, Error> {
    if let Some(value) = value.as_i30() {
        return Ok(PrimitiveNumber::I30(value));
    }
    match value {
        Value::UNDEFINED => Ok(PrimitiveNumber::F64(f64::NAN)),
        Value::NULL | Value::FALSE => Ok(PrimitiveNumber::I30(0)),
        Value::TRUE => Ok(PrimitiveNumber::I30(1)),
        _ => microesnext_numbers::get(arena, value).map(PrimitiveNumber::F64),
    }
}

/// Apply the allocation-free portion of JavaScript `ToNumber`.
///
/// String parsing and object `ToPrimitive` are separate compositions; values
/// requiring either are rejected rather than silently receiving host rules.
pub fn to_number(arena: &mut Arena<'_>, value: Value) -> Result<Value, Error> {
    match coerce(arena, value)? {
        PrimitiveNumber::I30(number) => {
            if value.as_i30().is_some() {
                Ok(value)
            } else {
                Ok(Value::from_i30(number).unwrap())
            }
        }
        PrimitiveNumber::F64(number) => {
            if value == Value::UNDEFINED {
                microesnext_numbers::new(arena, number)
            } else {
                Ok(value)
            }
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
