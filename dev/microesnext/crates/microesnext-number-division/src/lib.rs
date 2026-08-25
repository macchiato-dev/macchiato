#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

/// Apply JavaScript Number division without adding it to ordinary arithmetic.
pub fn divide(arena: &mut Arena<'_>, left: Value, right: Value) -> Result<Value, Error> {
    let result = number(arena, left)? / number(arena, right)?;
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
}
