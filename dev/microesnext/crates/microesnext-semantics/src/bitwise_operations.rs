use microesnext_types::{Error, Value};

/// Applies JavaScript's signed right shift to compact integer operands.
pub fn shift_right(left: Value, right: Value) -> Result<Value, Error> {
    let left = left.as_i30().ok_or(Error::Type)?;
    let right = right.as_i30().ok_or(Error::Type)? as u32 & 31;
    Value::from_i30(left >> right).ok_or(Error::Type)
}

/// Applies JavaScript's signed left shift to compact integer operands.
pub fn shift_left(left: Value, right: Value) -> Result<Value, Error> {
    let left = left.as_i30().ok_or(Error::Type)?;
    let right = right.as_i30().ok_or(Error::Type)? as u32 & 31;
    Value::from_i30(left.wrapping_shl(right)).ok_or(Error::Type)
}

/// Applies JavaScript's bitwise OR to compact integer operands.
pub fn or(left: Value, right: Value) -> Result<Value, Error> {
    let left = left.as_i30().ok_or(Error::Type)?;
    let right = right.as_i30().ok_or(Error::Type)?;
    Value::from_i30(left | right).ok_or(Error::Type)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn signed_shift_masks_the_right_operand() {
        let value = Value::from_i30(84).unwrap();
        assert_eq!(
            shift_right(value, Value::from_i30(1).unwrap())
                .unwrap()
                .as_i30(),
            Some(42)
        );
        assert_eq!(
            shift_right(value, Value::from_i30(33).unwrap())
                .unwrap()
                .as_i30(),
            Some(42)
        );
    }

    #[test]
    fn signed_left_shift_masks_the_right_operand() {
        let value = Value::from_i30(21).unwrap();
        assert_eq!(
            shift_left(value, Value::from_i30(1).unwrap())
                .unwrap()
                .as_i30(),
            Some(42)
        );
    }
}
