pub mod well_known;

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};

/// Create a unique symbol. The optional description is retained but is never
/// part of equality; distinct allocations are distinct symbols.
pub fn new(arena: &mut Arena<'_>, description: Value) -> Result<Value, Error> {
    if description != Value::UNDEFINED {
        let reference = description.as_ref().ok_or(Error::Type)?;
        if arena.kind(reference)? != BlockKind::String {
            return Err(Error::Type);
        }
    }
    let symbol = arena.allocate_values(BlockKind::Symbol, &mut [description], &mut [])?;
    Ok(Value::from_ref(symbol))
}

pub fn description(arena: &Arena<'_>, symbol: Value) -> Result<Value, Error> {
    let reference = symbol.as_ref().ok_or(Error::Type)?;
    if arena.kind(reference)? != BlockKind::Symbol {
        return Err(Error::Type);
    }
    let [description] = arena.values(reference)? else {
        return Err(Error::DanglingReference);
    };
    Ok(Value::from_raw(*description))
}

#[cfg(all(test, feature = "strings"))]
mod tests {
    use super::*;

    #[test]
    fn symbols_are_unique_and_retain_descriptions_through_relocation() {
        let mut memory = [0; 48];
        let mut arena = Arena::with_root_capacity(&mut memory, 2);
        let label = crate::strings::new(&mut arena, b"iterator").unwrap();
        let first = new(&mut arena, label).unwrap();
        let second = new(&mut arena, Value::UNDEFINED).unwrap();
        assert_ne!(first, second);
        let first_root = arena.retain(first).unwrap();
        let second_root = arena.retain(second).unwrap();

        arena.compact(&mut []).unwrap();

        let first = arena.root(first_root).unwrap();
        let second = arena.root(second_root).unwrap();
        let first_description = description(&arena, first).unwrap();
        assert!(
            arena
                .bytes_equal(first_description.as_ref().unwrap(), b"iterator")
                .unwrap()
        );
        assert_eq!(description(&arena, second), Ok(Value::UNDEFINED));
        assert_ne!(first, second);
    }
}
