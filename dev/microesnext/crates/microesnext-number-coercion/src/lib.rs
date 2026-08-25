#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

/// Numeric result before a boxed IEEE-754 value is materialized.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum PrimitiveNumber {
    I30(i32),
    F64(f64),
}

/// Distinguishes an existing numeric value from a converted primitive.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum PrimitiveCoercion {
    Original(Value),
    Converted(PrimitiveNumber),
}

/// Coerce a primitive while retaining the immediate-integer fast path.
#[inline]
pub fn try_coerce(arena: &Arena<'_>, value: Value) -> Result<Option<PrimitiveCoercion>, Error> {
    if value.as_i30().is_some() {
        return Ok(Some(PrimitiveCoercion::Original(value)));
    }
    match value {
        Value::UNDEFINED => Ok(Some(PrimitiveCoercion::Converted(PrimitiveNumber::F64(
            f64::NAN,
        )))),
        Value::NULL | Value::FALSE => {
            Ok(Some(PrimitiveCoercion::Converted(PrimitiveNumber::I30(0))))
        }
        Value::TRUE => Ok(Some(PrimitiveCoercion::Converted(PrimitiveNumber::I30(1)))),
        _ => microesnext_numbers::try_get(arena, value)
            .map(|number| number.map(|_| PrimitiveCoercion::Original(value))),
    }
}

#[inline]
pub fn coerce(arena: &Arena<'_>, value: Value) -> Result<PrimitiveNumber, Error> {
    match try_coerce(arena, value)?.ok_or(Error::Type)? {
        PrimitiveCoercion::Original(value) => {
            if let Some(value) = value.as_i30() {
                Ok(PrimitiveNumber::I30(value))
            } else {
                microesnext_numbers::get(arena, value).map(PrimitiveNumber::F64)
            }
        }
        PrimitiveCoercion::Converted(number) => Ok(number),
    }
}

pub fn materialize(arena: &mut Arena<'_>, number: PrimitiveNumber) -> Result<Value, Error> {
    match number {
        PrimitiveNumber::I30(number) => Ok(Value::from_i30(number).unwrap()),
        PrimitiveNumber::F64(number) => microesnext_numbers::new(arena, number),
    }
}

/// Apply the allocation-free portion of JavaScript `ToNumber`.
///
/// String parsing and object `ToPrimitive` are separate compositions; values
/// requiring either are rejected rather than silently receiving host rules.
pub fn to_number(arena: &mut Arena<'_>, value: Value) -> Result<Value, Error> {
    match try_coerce(arena, value)?.ok_or(Error::Type)? {
        PrimitiveCoercion::Original(value) => Ok(value),
        PrimitiveCoercion::Converted(number) => materialize(arena, number),
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
