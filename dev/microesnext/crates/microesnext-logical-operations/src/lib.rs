#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

pub fn is_truthy(arena: &Arena<'_>, value: Value) -> Result<bool, Error> {
    microesnext_truthiness::to_boolean(arena, value)
}

pub fn is_falsy(arena: &Arena<'_>, value: Value) -> Result<bool, Error> {
    Ok(!is_truthy(arena, value)?)
}

pub fn logical_not(arena: &Arena<'_>, value: Value) -> Result<Value, Error> {
    Ok(if is_falsy(arena, value)? {
        Value::TRUE
    } else {
        Value::FALSE
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn handles_immediates_without_scalar_storage() {
        let mut memory = [0; 8];
        let arena = Arena::new(&mut memory);
        assert!(is_falsy(&arena, Value::FALSE).unwrap());
        assert!(is_truthy(&arena, Value::TRUE).unwrap());
        assert_eq!(logical_not(&arena, Value::FALSE), Ok(Value::TRUE));
        assert_eq!(logical_not(&arena, Value::TRUE), Ok(Value::FALSE));
    }

    macro_rules! scalar_falsy_test {
        ($feature:literal, $name:ident, $value:expr) => {
            #[cfg(feature = $feature)]
            #[test]
            fn $name() {
                let mut memory = [0; 48];
                let mut arena = Arena::new(&mut memory);
                let value = $value(&mut arena);
                assert!(is_falsy(&arena, value).unwrap());
            }
        };
    }

    scalar_falsy_test!("numbers", handles_numbers_without_strings, |arena| {
        microesnext_numbers::new(arena, f64::NAN).unwrap()
    });
    scalar_falsy_test!("strings", handles_strings_without_numbers, |arena| {
        microesnext_strings::new(arena, b"").unwrap()
    });
}
