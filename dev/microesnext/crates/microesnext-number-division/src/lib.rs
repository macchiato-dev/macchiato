#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

/// Apply JavaScript Number division without adding it to ordinary arithmetic.
pub fn divide(arena: &mut Arena<'_>, left: Value, right: Value) -> Result<Value, Error> {
    let result = number(arena, left)? / number(arena, right)?;
    microesnext_numbers::new(arena, result)
}

/// Apply JavaScript Number remainder, retaining exact immediate results.
pub fn remainder(arena: &mut Arena<'_>, left: Value, right: Value) -> Result<Value, Error> {
    if let (Some(left), Some(right)) = (left.as_i30(), right.as_i30())
        && right != 0
    {
        return Value::from_i30(left % right).ok_or(Error::Type);
    }
    let result = number(arena, left)? % number(arena, right)?;
    microesnext_numbers::new(arena, result)
}

fn number(arena: &Arena<'_>, value: Value) -> Result<f64, Error> {
    if let Some(value) = value.as_i30() {
        Ok(value as f64)
    } else {
        microesnext_numbers::get(arena, value)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn divides_and_preserves_javascript_edges() {
        let mut memory = [0; 96];
        let mut arena = Arena::new(&mut memory);
        let one = Value::from_i30(1).unwrap();
        let two = Value::from_i30(2).unwrap();
        let zero = Value::from_i30(0).unwrap();

        let half = divide(&mut arena, one, two).unwrap();
        assert_eq!(microesnext_numbers::get(&arena, half), Ok(0.5));
        let infinity = divide(&mut arena, one, zero).unwrap();
        assert_eq!(
            microesnext_numbers::get(&arena, infinity),
            Ok(f64::INFINITY)
        );
        let nan = divide(&mut arena, zero, zero).unwrap();
        assert!(microesnext_numbers::get(&arena, nan).unwrap().is_nan());
    }

    #[test]
    fn keeps_safe_remainders_immediate_and_boxes_negative_zero() {
        let mut memory = [0; 64];
        let mut arena = Arena::new(&mut memory);
        let seven = Value::from_i30(7).unwrap();
        let three = Value::from_i30(3).unwrap();
        assert_eq!(
            remainder(&mut arena, seven, three).unwrap().as_i30(),
            Some(1)
        );

        let negative_zero = microesnext_numbers::new(&mut arena, -0.0).unwrap();
        let result = remainder(&mut arena, negative_zero, three).unwrap();
        let result = microesnext_numbers::get(&arena, result).unwrap();
        assert_eq!(result, 0.0);
        assert!(result.is_sign_negative());
    }
}
