#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

const KEYS: u16 = microesnext_iterators::kind::COLLECTION_KEYS;
const VALUES: u16 = microesnext_iterators::kind::COLLECTION_VALUES;

pub fn new_keys(arena: &mut Arena<'_>, collection: Value) -> Result<Value, Error> {
    new(arena, collection, KEYS)
}

pub fn new_values(arena: &mut Arena<'_>, collection: Value) -> Result<Value, Error> {
    new(arena, collection, VALUES)
}

pub fn next(arena: &mut Arena<'_>, iterator: Value) -> Result<Option<Value>, Error> {
    let (collection, mut index, kind) = microesnext_iterators::state(arena, iterator)?;
    if kind != KEYS && kind != VALUES {
        return Err(Error::Type);
    }
    let entry = microesnext_collections::next_from(arena, collection, &mut index)?;
    microesnext_iterators::set_index(arena, iterator, index)?;
    let Some((key, value)) = entry else {
        return Ok(None);
    };
    match kind {
        KEYS => Ok(Some(key)),
        VALUES => Ok(Some(value)),
        _ => unreachable!(),
    }
}

fn new(arena: &mut Arena<'_>, collection: Value, kind: u16) -> Result<Value, Error> {
    microesnext_collections::len(arena, collection)?;
    microesnext_iterators::new(arena, collection, kind)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn integer(value: i32) -> Value {
        Value::from_i30(value).unwrap()
    }

    #[test]
    fn skips_deletions_and_observes_appends() {
        let mut memory = [0; 160];
        let mut arena = Arena::new(&mut memory);
        let map = microesnext_collections::new_map(&mut arena).unwrap();
        let map = microesnext_collections::set(&mut arena, map, integer(1), integer(10)).unwrap();
        let map = microesnext_collections::set(&mut arena, map, integer(2), integer(20)).unwrap();
        let iterator = new_values(&mut arena, map).unwrap();
        assert_eq!(next(&mut arena, iterator), Ok(Some(integer(10))));
        assert!(microesnext_collections::delete(&mut arena, map, integer(2)).unwrap());
        assert_eq!(
            microesnext_collections::set(&mut arena, map, integer(3), integer(30)).unwrap(),
            map
        );
        assert_eq!(next(&mut arena, iterator), Ok(Some(integer(30))));
        assert_eq!(next(&mut arena, iterator), Ok(None));
    }
}
