#![no_std]

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};

/// Apply JavaScript `typeof` and allocate its ordinary string result.
pub fn type_of(arena: &mut Arena<'_>, value: Value) -> Result<Value, Error> {
    let name: &[u8] = if value == Value::UNDEFINED {
        b"undefined"
    } else if matches!(value, Value::FALSE | Value::TRUE) {
        b"boolean"
    } else if value == Value::NULL {
        b"object"
    } else if value.as_i30().is_some() {
        b"number"
    } else if let Some(reference) = value.as_ref() {
        match arena.kind(reference)? {
            BlockKind::String => b"string",
            BlockKind::Closure => b"function",
            #[cfg(feature = "numbers")]
            BlockKind::Number => b"number",
            #[cfg(feature = "symbols")]
            BlockKind::Symbol => b"symbol",
            #[cfg(feature = "async-functions")]
            BlockKind::AsyncClosure => b"function",
            #[cfg(feature = "promise-resolvers")]
            BlockKind::PromiseResolver => b"function",
            _ => b"object",
        }
    } else {
        return Err(Error::Type);
    };
    microesnext_strings::new(arena, name)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn assert_type(arena: &mut Arena<'_>, value: Value, expected: &[u8]) {
        let result = type_of(arena, value).unwrap().as_ref().unwrap();
        assert!(arena.bytes_equal(result, expected).unwrap());
    }

    #[test]
    fn classifies_immediates_strings_objects_and_closures() {
        let mut memory = [0; 96];
        let mut arena = Arena::new(&mut memory);
        assert_type(&mut arena, Value::UNDEFINED, b"undefined");
        assert_type(&mut arena, Value::NULL, b"object");
        assert_type(&mut arena, Value::TRUE, b"boolean");
        assert_type(&mut arena, Value::from_i30(42).unwrap(), b"number");

        let string = microesnext_strings::new(&mut arena, b"value").unwrap();
        assert_type(&mut arena, string, b"string");
        let object = arena
            .allocate_values(BlockKind::Object, &mut [], &mut [])
            .map(Value::from_ref)
            .unwrap();
        assert_type(&mut arena, object, b"object");
        let closure = arena
            .allocate_values(BlockKind::Closure, &mut [], &mut [])
            .map(Value::from_ref)
            .unwrap();
        assert_type(&mut arena, closure, b"function");
    }

    #[cfg(feature = "numbers")]
    #[test]
    fn classifies_boxed_numbers_when_composed() {
        let mut memory = [0; 48];
        let mut arena = Arena::new(&mut memory);
        let number = arena
            .allocate_values(BlockKind::Number, &mut [Value::NULL; 2], &mut [])
            .map(Value::from_ref)
            .unwrap();
        assert_type(&mut arena, number, b"number");
    }

    #[cfg(feature = "symbols")]
    #[test]
    fn classifies_symbols_when_composed() {
        let mut memory = [0; 40];
        let mut arena = Arena::new(&mut memory);
        let symbol = arena
            .allocate_values(BlockKind::Symbol, &mut [], &mut [])
            .map(Value::from_ref)
            .unwrap();
        assert_type(&mut arena, symbol, b"symbol");
    }

    #[cfg(all(feature = "async-functions", feature = "promise-resolvers"))]
    #[test]
    fn classifies_optional_callable_records() {
        let mut memory = [0; 48];
        let mut arena = Arena::new(&mut memory);
        let async_closure = arena
            .allocate_values(BlockKind::AsyncClosure, &mut [], &mut [])
            .map(Value::from_ref)
            .unwrap();
        assert_type(&mut arena, async_closure, b"function");
        let resolver = arena
            .allocate_values(BlockKind::PromiseResolver, &mut [], &mut [])
            .map(Value::from_ref)
            .unwrap();
        assert_type(&mut arena, resolver, b"function");
    }
}
