use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

/// Apply JavaScript Number remainder, retaining exact immediate results.
pub fn remainder(arena: &mut Arena<'_>, left: Value, right: Value) -> Result<Value, Error> {
    if let (Some(left), Some(right)) = (left.as_i30(), right.as_i30())
        && right != 0
    {
        return Value::from_i30(left % right).ok_or(Error::Type);
    }
    let result = number(arena, left)? % number(arena, right)?;
    crate::numbers::new(arena, result)
}

fn number(arena: &Arena<'_>, value: Value) -> Result<f64, Error> {
    if let Some(value) = value.as_i30() {
        Ok(value as f64)
    } else {
        crate::numbers::get(arena, value)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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

        let negative_zero = crate::numbers::new(&mut arena, -0.0).unwrap();
        let result = remainder(&mut arena, negative_zero, three).unwrap();
        let result = crate::numbers::get(&arena, result).unwrap();
        assert_eq!(result, 0.0);
        assert!(result.is_sign_negative());
    }
}
