#![no_std]

use microesnext_arena::Arena;
use microesnext_symbols::well_known::WellKnownSymbols;
use microesnext_types::{Error, Value};

/// Define an object's realm-local `[Symbol.iterator]` property. The supplied
/// value is deliberately opaque here; callable validation belongs to the
/// independently removable function/call layer.
pub fn define(
    arena: &mut Arena<'_>,
    object: Value,
    symbols: &WellKnownSymbols,
    method: Value,
) -> Result<Value, Error> {
    let key = symbols.iterator(arena)?;
    microesnext_objects::set(arena, object, key, method)
}

/// Look up `[Symbol.iterator]`, including through the prototype chain. `null`
/// and `undefined` both represent an absent optional method at this boundary.
pub fn get(
    arena: &Arena<'_>,
    object: Value,
    symbols: &WellKnownSymbols,
) -> Result<Option<Value>, Error> {
    let key = symbols.iterator(arena)?;
    match microesnext_objects::get(arena, object, key)? {
        Value::NULL | Value::UNDEFINED => Ok(None),
        method => Ok(Some(method)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inherits_only_the_current_realms_iterator_binding() {
        let mut memory = [0; 128];
        let mut arena = Arena::with_root_capacity(&mut memory, 2);
        let symbols = WellKnownSymbols::new(&mut arena).unwrap();
        let other_symbols = WellKnownSymbols::new(&mut arena).unwrap();
        let method = microesnext_arena::closures::capture_stack(&mut arena, 17, 0).unwrap();
        let prototype = microesnext_objects::new_object(&mut arena, Value::NULL).unwrap();
        let prototype = define(&mut arena, prototype, &symbols, method).unwrap();
        let iterable = microesnext_objects::new_object(&mut arena, prototype).unwrap();

        let inherited = get(&arena, iterable, &symbols).unwrap().unwrap();
        assert_eq!(
            microesnext_arena::closures::entry(&arena, inherited),
            Ok(17)
        );
        assert_eq!(get(&arena, iterable, &other_symbols), Ok(None));
    }
}
