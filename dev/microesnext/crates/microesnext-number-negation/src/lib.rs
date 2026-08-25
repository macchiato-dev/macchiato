#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

pub fn negate(arena: &mut Arena<'_>, value: Value) -> Result<Value, Error> {
    if value.as_i30().is_some_and(|value| value != 0) {
        if let Ok(value) = microesnext_integer_negation::negate(value) {
            return Ok(value);
        }
    }
    let result = -microesnext_numbers::get(arena, value)?;
    microesnext_numbers::new(arena, result)
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
    }
}
