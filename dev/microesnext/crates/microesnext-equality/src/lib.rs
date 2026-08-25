#![no_std]

use microesnext_arena::Arena;
#[cfg(feature = "strings")]
use microesnext_arena::BlockKind;
use microesnext_types::{Error, Value};

pub fn same_value_zero(arena: &Arena<'_>, left: Value, right: Value) -> Result<bool, Error> {
    #[cfg(not(any(feature = "numbers", feature = "strings")))]
    let _ = arena;
    if left == right {
        return Ok(true);
    }
    #[cfg(feature = "numbers")]
    {
        let left_number = microesnext_numbers::try_get(arena, left)?;
        let right_number = microesnext_numbers::try_get(arena, right)?;
        if left_number.is_some() || right_number.is_some() {
            let (Some(left), Some(right)) = (left_number, right_number) else {
                return Ok(false);
            };
            return Ok(left == right || left.is_nan() && right.is_nan());
        }
    }
    #[cfg(feature = "strings")]
    if let (Some(left), Some(right)) = (left.as_ref(), right.as_ref()) {
        if arena.kind(left)? == BlockKind::String && arena.kind(right)? == BlockKind::String {
            let length = arena.byte_len(left)?;
            if length != arena.byte_len(right)? {
                return Ok(false);
            }
            for index in 0..length {
                if arena.byte(left, index)? != arena.byte(right, index)? {
                    return Ok(false);
                }
            }
            return Ok(true);
        }
    }
    Ok(false)
}

#[cfg(all(test, any(feature = "numbers", feature = "strings")))]
mod tests {
    use super::*;

    #[cfg(feature = "numbers")]
    #[test]
    fn numbers_use_same_value_zero() {
        let mut memory = [0; 48];
        let mut arena = Arena::new(&mut memory);
        let nan_a = microesnext_numbers::new(&mut arena, f64::NAN).unwrap();
        let nan_b = microesnext_numbers::new(&mut arena, f64::NAN).unwrap();
        assert!(same_value_zero(&arena, nan_a, nan_b).unwrap());
        let zero = microesnext_numbers::new(&mut arena, 0.0).unwrap();
        let negative_zero = microesnext_numbers::new(&mut arena, -0.0).unwrap();
        assert!(same_value_zero(&arena, zero, negative_zero).unwrap());
    }

    #[cfg(feature = "strings")]
    #[test]
    fn separately_allocated_strings_compare_by_content() {
        let mut memory = [0; 48];
        let mut arena = Arena::new(&mut memory);
        let left = microesnext_strings::new(&mut arena, b"key").unwrap();
        let right = microesnext_strings::new(&mut arena, b"key").unwrap();
        assert_ne!(left, right);
        assert!(same_value_zero(&arena, left, right).unwrap());
    }
}
