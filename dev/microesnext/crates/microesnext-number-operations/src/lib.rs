#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

pub fn add(arena: &mut Arena<'_>, left: Value, right: Value) -> Result<Value, Error> {
    if let Some(value) = immediate(left, right, i32::checked_add) {
        return Ok(value);
    }
    let result = microesnext_numbers::get(arena, left)? + microesnext_numbers::get(arena, right)?;
    microesnext_numbers::new(arena, result)
}

pub fn subtract(arena: &mut Arena<'_>, left: Value, right: Value) -> Result<Value, Error> {
    if let Some(value) = immediate(left, right, i32::checked_sub) {
        return Ok(value);
    }
    let result = microesnext_numbers::get(arena, left)? - microesnext_numbers::get(arena, right)?;
    microesnext_numbers::new(arena, result)
}

pub fn multiply(arena: &mut Arena<'_>, left: Value, right: Value) -> Result<Value, Error> {
    if let Some(value) = immediate(left, right, i32::checked_mul) {
        return Ok(value);
    }
    let result = microesnext_numbers::get(arena, left)? * microesnext_numbers::get(arena, right)?;
    microesnext_numbers::new(arena, result)
}

pub fn less_than(arena: &Arena<'_>, left: Value, right: Value) -> Result<Value, Error> {
    if let (Some(left), Some(right)) = (left.as_i30(), right.as_i30()) {
        return Ok(boolean(left < right));
    }
    Ok(boolean(
        microesnext_numbers::get(arena, left)? < microesnext_numbers::get(arena, right)?,
    ))
}

pub fn greater_than(arena: &Arena<'_>, left: Value, right: Value) -> Result<Value, Error> {
    if let (Some(left), Some(right)) = (left.as_i30(), right.as_i30()) {
        return Ok(boolean(left > right));
    }
    Ok(boolean(
        microesnext_numbers::get(arena, left)? > microesnext_numbers::get(arena, right)?,
    ))
}

fn immediate(left: Value, right: Value, operation: fn(i32, i32) -> Option<i32>) -> Option<Value> {
    operation(left.as_i30()?, right.as_i30()?).and_then(Value::from_i30)
}

fn boolean(value: bool) -> Value {
    if value { Value::TRUE } else { Value::FALSE }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn promotes_beyond_the_immediate_range() {
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        let maximum = Value::from_i30((1 << 29) - 1).unwrap();
        let two = Value::from_i30(2).unwrap();

        let sum = add(&mut arena, maximum, two).unwrap();
        assert_eq!(
            microesnext_numbers::get(&arena, sum),
            Ok((1 << 29) as f64 + 1.0)
        );
        let product = multiply(&mut arena, maximum, two).unwrap();
        assert_eq!(
            microesnext_numbers::get(&arena, product),
            Ok(((1 << 29) - 1) as f64 * 2.0)
        );
        assert_eq!(
            subtract(&mut arena, maximum, two).unwrap().as_i30(),
            Some((1 << 29) - 3)
        );
        assert_eq!(less_than(&arena, two, maximum), Ok(Value::TRUE));
        assert_eq!(greater_than(&arena, two, maximum), Ok(Value::FALSE));
    }
}
