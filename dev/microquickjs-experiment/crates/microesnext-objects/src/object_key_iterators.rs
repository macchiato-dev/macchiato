use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

const KEYS: u16 = crate::iterators::kind::OBJECT_KEYS;

pub fn new(arena: &mut Arena<'_>, object: Value) -> Result<Value, Error> {
    crate::own_property_count(arena, object)?;
    crate::iterators::new(arena, object, KEYS)
}

pub fn next(arena: &mut Arena<'_>, iterator: Value) -> Result<Option<Value>, Error> {
    let (object, index, kind) = crate::iterators::state(arena, iterator)?;
    if kind != KEYS {
        return Err(Error::Type);
    }
    if index >= crate::own_property_count(arena, object)? {
        return Ok(None);
    }
    let key = crate::own_property_key(arena, object, index)?;
    crate::iterators::set_index(arena, iterator, index + 1)?;
    Ok(Some(key))
}

#[cfg(test)]
mod tests {
    use microesnext_values::strings::atoms::Atoms;

    use super::*;

    #[test]
    fn yields_own_keys_in_insertion_order() {
        let mut memory = [0; 256];
        let mut arena = Arena::with_root_capacity(&mut memory, 4);
        let mut atoms = Atoms::new(&mut arena).unwrap();
        let first = atoms.intern(&mut arena, b"first").unwrap();
        let second = atoms.intern(&mut arena, b"second").unwrap();
        let object = crate::new_object(&mut arena, Value::NULL).unwrap();
        crate::set(&mut arena, object, first, Value::TRUE).unwrap();
        crate::set(&mut arena, object, second, Value::FALSE).unwrap();
        let iterator = new(&mut arena, object).unwrap();
        assert_eq!(next(&mut arena, iterator), Ok(Some(first)));
        assert_eq!(next(&mut arena, iterator), Ok(Some(second)));
        assert_eq!(next(&mut arena, iterator), Ok(None));
    }
}
