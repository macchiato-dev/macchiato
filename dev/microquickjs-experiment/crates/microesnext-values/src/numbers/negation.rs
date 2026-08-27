use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

pub fn negate(arena: &mut Arena<'_>, value: Value) -> Result<Value, Error> {
    if let Some(number) = value.as_i30() {
        if number != 0 {
            if let Some(value) = number.checked_neg().and_then(Value::from_i30) {
                return Ok(value);
            }
        }
        return crate::numbers::new(arena, -(number as f64));
    }
    let number = crate::numbers::coercion::coerce(arena, value)?;
    negate_coerced(arena, number)
}

#[inline(always)]
pub fn negate_coerced(
    arena: &mut Arena<'_>,
    number: crate::numbers::coercion::PrimitiveNumber,
) -> Result<Value, Error> {
    match number {
        crate::numbers::coercion::PrimitiveNumber::I30(value) => {
            crate::numbers::new(arena, -(value as f64))
        }
        crate::numbers::coercion::PrimitiveNumber::F64(value) => crate::numbers::new(arena, -value),
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
        let zero = crate::numbers::get(&arena, zero).unwrap();
        assert_eq!(zero, 0.0);
        assert!(zero.is_sign_negative());
        assert_eq!(negate(&mut arena, Value::TRUE).unwrap().as_i30(), Some(-1));
        let undefined = negate(&mut arena, Value::UNDEFINED).unwrap();
        assert!(crate::numbers::get(&arena, undefined).unwrap().is_nan());
    }
}
