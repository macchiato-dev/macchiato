#![no_std]

use microesnext_types::{Error, Value};

pub fn negate(value: Value) -> Result<Value, Error> {
    value
        .as_i30()
        .and_then(i32::checked_neg)
        .and_then(Value::from_i30)
        .ok_or(Error::Type)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn negates_only_results_representable_as_i30() {
        assert_eq!(
            negate(Value::from_i30(42).unwrap()).unwrap().as_i30(),
            Some(-42)
        );
        assert_eq!(
            negate(Value::from_i30(-(1 << 29)).unwrap()),
            Err(Error::Type)
        );
        assert_eq!(negate(Value::TRUE), Err(Error::Type));
    }
}
