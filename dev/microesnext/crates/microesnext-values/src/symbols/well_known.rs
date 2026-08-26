use microesnext_arena::Arena;
use microesnext_types::{Error, RootId, Value};

/// Realm-owned symbol identities. Keeping these behind one removable object
/// avoids making an ordinary symbol allocation retain realm state.
pub struct WellKnownSymbols {
    iterator: RootId,
}

impl WellKnownSymbols {
    /// Create the minimum table without allocating description strings.
    pub fn new(arena: &mut Arena<'_>) -> Result<Self, Error> {
        Self::with_iterator_description(arena, Value::UNDEFINED)
    }

    /// A string-capable realm can supply `"Symbol.iterator"`; a smaller realm
    /// can use `new` and omit the string capability entirely.
    pub fn with_iterator_description(
        arena: &mut Arena<'_>,
        description: Value,
    ) -> Result<Self, Error> {
        let iterator = super::new(arena, description)?;
        Ok(Self {
            iterator: arena.retain(iterator)?,
        })
    }

    pub fn iterator(&self, arena: &Arena<'_>) -> Result<Value, Error> {
        arena.root(self.iterator)
    }

    pub fn release(self, arena: &mut Arena<'_>) -> Result<(), Error> {
        arena.release(self.iterator).map(|_| ())
    }
}

#[cfg(all(test, feature = "strings"))]
mod tests {
    use super::*;

    #[test]
    fn realm_identity_survives_relocation_without_a_string_dependency() {
        let mut memory = [0; 32];
        let mut arena = Arena::with_root_capacity(&mut memory, 1);
        crate::symbols::new(&mut arena, Value::UNDEFINED).unwrap();
        let symbols = WellKnownSymbols::new(&mut arena).unwrap();
        let before = symbols.iterator(&arena).unwrap();
        arena.compact(&mut []).unwrap();
        let after = symbols.iterator(&arena).unwrap();
        assert_eq!(
            crate::symbols::description(&arena, after),
            Ok(Value::UNDEFINED)
        );
        assert_ne!(before.as_ref().unwrap(), after.as_ref().unwrap());
        symbols.release(&mut arena).unwrap();
    }

    #[test]
    fn a_caller_can_compose_the_standard_description() {
        let mut memory = [0; 48];
        let mut arena = Arena::with_root_capacity(&mut memory, 1);
        let description = crate::strings::new(&mut arena, b"Symbol.iterator").unwrap();
        let symbols = WellKnownSymbols::with_iterator_description(&mut arena, description).unwrap();
        let symbol = symbols.iterator(&arena).unwrap();
        let description = crate::symbols::description(&arena, symbol)
            .unwrap()
            .as_ref()
            .unwrap();
        assert!(arena.bytes_equal(description, b"Symbol.iterator").unwrap());
    }
}
