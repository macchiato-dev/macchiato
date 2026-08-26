use microesnext_arena::Arena;
#[cfg(feature = "string-values")]
use microesnext_arena::BlockKind;
use microesnext_types::{Error, Value};

pub fn same_value_zero(arena: &Arena<'_>, left: Value, right: Value) -> Result<bool, Error> {
    #[cfg(not(any(feature = "numbers", feature = "string-values")))]
    let _ = arena;
    if left == right {
        return Ok(true);
    }
    #[cfg(feature = "numbers")]
    {
        let left_number = microesnext_values::numbers::try_get(arena, left)?;
        let right_number = microesnext_values::numbers::try_get(arena, right)?;
        if left_number.is_some() || right_number.is_some() {
            let (Some(left), Some(right)) = (left_number, right_number) else {
                return Ok(false);
            };
            return Ok(left == right || left.is_nan() && right.is_nan());
        }
    }
    #[cfg(feature = "string-values")]
    if string_equal(arena, left, right)? {
        return Ok(true);
    }
    Ok(false)
}

pub fn strict_equal(arena: &Arena<'_>, left: Value, right: Value) -> Result<bool, Error> {
    #[cfg(not(any(feature = "numbers", feature = "string-values")))]
    let _ = arena;
    #[cfg(feature = "numbers")]
    {
        let left_number = microesnext_values::numbers::try_get(arena, left)?;
        let right_number = microesnext_values::numbers::try_get(arena, right)?;
        if left_number.is_some() || right_number.is_some() {
            let (Some(left), Some(right)) = (left_number, right_number) else {
                return Ok(false);
            };
            return Ok(left == right);
        }
    }
    if left == right {
        return Ok(true);
    }
    #[cfg(feature = "string-values")]
    if string_equal(arena, left, right)? {
        return Ok(true);
    }
    Ok(false)
}

#[cfg(feature = "string-values")]
fn string_equal(arena: &Arena<'_>, left: Value, right: Value) -> Result<bool, Error> {
    let (Some(left), Some(right)) = (left.as_ref(), right.as_ref()) else {
        return Ok(false);
    };
    if arena.kind(left)? != BlockKind::String || arena.kind(right)? != BlockKind::String {
        return Ok(false);
    }
    let length = arena.byte_len(left)?;
    if length != arena.byte_len(right)? {
        return Ok(false);
    }
    for index in 0..length {
        if arena.byte(left, index)? != arena.byte(right, index)? {
            return Ok(false);
        }
    }
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strict_equality_compares_immediate_identity() {
        let mut memory = [0; 8];
        let arena = Arena::new(&mut memory);
        assert!(strict_equal(&arena, Value::TRUE, Value::TRUE).unwrap());
        assert!(!strict_equal(&arena, Value::TRUE, Value::FALSE).unwrap());
    }

    #[cfg(feature = "numbers")]
    #[test]
    fn numbers_use_same_value_zero() {
        let mut memory = [0; 48];
        let mut arena = Arena::new(&mut memory);
        let nan_a = microesnext_values::numbers::new(&mut arena, f64::NAN).unwrap();
        let nan_b = microesnext_values::numbers::new(&mut arena, f64::NAN).unwrap();
        assert!(same_value_zero(&arena, nan_a, nan_b).unwrap());
        let zero = microesnext_values::numbers::new(&mut arena, 0.0).unwrap();
        let negative_zero = microesnext_values::numbers::new(&mut arena, -0.0).unwrap();
        assert!(same_value_zero(&arena, zero, negative_zero).unwrap());
        assert!(!strict_equal(&arena, nan_a, nan_b).unwrap());
        assert!(strict_equal(&arena, zero, negative_zero).unwrap());
    }

    #[cfg(feature = "string-values")]
    #[test]
    fn separately_allocated_strings_compare_by_content() {
        let mut memory = [0; 48];
        let mut arena = Arena::new(&mut memory);
        let left = microesnext_values::strings::new(&mut arena, b"key").unwrap();
        let right = microesnext_values::strings::new(&mut arena, b"key").unwrap();
        assert_ne!(left, right);
        assert!(same_value_zero(&arena, left, right).unwrap());
        assert!(strict_equal(&arena, left, right).unwrap());
    }
}
