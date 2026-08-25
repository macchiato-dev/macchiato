#![no_std]

use microesnext_types::{Error, Value};

pub fn subtract(left: Value, right: Value) -> Result<Value, Error> {
    binary_i30(left, right, i32::checked_sub)
}

pub fn multiply(left: Value, right: Value) -> Result<Value, Error> {
    binary_i30(left, right, i32::checked_mul)
}

fn binary_i30(
    left: Value,
    right: Value,
    operation: fn(i32, i32) -> Option<i32>,
) -> Result<Value, Error> {
    let left = left.as_i30().ok_or(Error::Type)?;
    let right = right.as_i30().ok_or(Error::Type)?;
    operation(left, right)
        .and_then(Value::from_i30)
        .ok_or(Error::Type)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn computes_results_that_remain_immediate() {
        let six = Value::from_i30(6).unwrap();
        let seven = Value::from_i30(7).unwrap();
        assert_eq!(multiply(six, seven).unwrap().as_i30(), Some(42));
        assert_eq!(subtract(seven, six).unwrap().as_i30(), Some(1));
    }

    #[test]
    fn rejects_non_integers_and_i30_overflow() {
        assert_eq!(multiply(Value::TRUE, Value::TRUE), Err(Error::Type));
        let maximum = Value::from_i30((1 << 29) - 1).unwrap();
        assert_eq!(multiply(maximum, Value::from_i30(2).unwrap()), Err(Error::Type));
    }
}
