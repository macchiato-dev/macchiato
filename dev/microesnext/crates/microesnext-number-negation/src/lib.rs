#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

pub fn negate(arena: &mut Arena<'_>, value: Value) -> Result<Value, Error> {
    if let Some(number) = value.as_i30() {
        if number != 0 {
            if let Ok(value) = microesnext_integer_negation::negate(value) {
                return Ok(value);
            }
        }
        return microesnext_numbers::new(arena, -(number as f64));
    }
    let number = microesnext_number_coercion::coerce(arena, value)?;
    negate_coerced(arena, number)
}

#[inline(always)]
pub fn negate_coerced(
    arena: &mut Arena<'_>,
    number: microesnext_number_coercion::PrimitiveNumber,
) -> Result<Value, Error> {
    match number {
        microesnext_number_coercion::PrimitiveNumber::I30(value) => {
            microesnext_numbers::new(arena, -(value as f64))
        }
        microesnext_number_coercion::PrimitiveNumber::F64(value) => {
            microesnext_numbers::new(arena, -value)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn retains_i30_fast_path_but_boxes_negative_zero() {
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        assert_eq!(
            negate(&mut arena, Value::from_i30(42).unwrap())
                .unwrap()
                .as_i30(),
            Some(-42)
        );
        let zero = negate(&mut arena, Value::from_i30(0).unwrap()).unwrap();
        let zero = microesnext_numbers::get(&arena, zero).unwrap();
        assert_eq!(zero, 0.0);
        assert!(zero.is_sign_negative());
        assert_eq!(negate(&mut arena, Value::TRUE).unwrap().as_i30(), Some(-1));
        let undefined = negate(&mut arena, Value::UNDEFINED).unwrap();
        assert!(
            microesnext_numbers::get(&arena, undefined)
                .unwrap()
                .is_nan()
        );
    }
}
