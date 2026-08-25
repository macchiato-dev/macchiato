#![no_std]

use microesnext_types::{Error, Value};

pub fn subtract(left: Value, right: Value) -> Result<Value, Error> {
    let (left, right) = operands(left, right)?;
    left.checked_sub(right)
        .and_then(Value::from_i30)
        .ok_or(Error::Type)
}

pub fn negate(value: Value) -> Result<Value, Error> {
    value
        .as_i30()
        .and_then(i32::checked_neg)
        .and_then(Value::from_i30)
        .ok_or(Error::Type)
}

pub fn multiply(left: Value, right: Value) -> Result<Value, Error> {
    let (left, right) = operands(left, right)?;
    left.checked_mul(right)
        .and_then(Value::from_i30)
        .ok_or(Error::Type)
}

pub fn less_than(left: Value, right: Value) -> Result<Value, Error> {
    let (left, right) = operands(left, right)?;
    Ok(boolean(left < right))
}

pub fn greater_than(left: Value, right: Value) -> Result<Value, Error> {
    let (left, right) = operands(left, right)?;
    Ok(boolean(left > right))
}

fn operands(left: Value, right: Value) -> Result<(i32, i32), Error> {
    let left = left.as_i30().ok_or(Error::Type)?;
    let right = right.as_i30().ok_or(Error::Type)?;
    Ok((left, right))
}

fn boolean(value: bool) -> Value {
    if value { Value::TRUE } else { Value::FALSE }
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
        assert_eq!(less_than(six, seven), Ok(Value::TRUE));
        assert_eq!(greater_than(six, seven), Ok(Value::FALSE));
        assert_eq!(negate(six).unwrap().as_i30(), Some(-6));
    }

    #[test]
    fn rejects_non_integers_and_i30_overflow() {
        assert_eq!(multiply(Value::TRUE, Value::TRUE), Err(Error::Type));
        let maximum = Value::from_i30((1 << 29) - 1).unwrap();
        assert_eq!(
            multiply(maximum, Value::from_i30(2).unwrap()),
            Err(Error::Type)
        );
        assert_eq!(
            negate(Value::from_i30(-(1 << 29)).unwrap()),
            Err(Error::Type)
        );
    }
}
