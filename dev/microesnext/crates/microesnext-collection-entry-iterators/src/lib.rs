#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

const ENTRIES: u16 = microesnext_iterators::kind::COLLECTION_ENTRIES;

pub fn new(arena: &mut Arena<'_>, map: Value) -> Result<Value, Error> {
    microesnext_collections::len(arena, map)?;
    microesnext_iterators::new(arena, map, ENTRIES)
}

/// Allocate the pair array only when an entry exists. Map key/value iteration
/// stays in its smaller adapter and never links this array boundary.
pub fn next(arena: &mut Arena<'_>, iterator: Value) -> Result<Option<Value>, Error> {
    let (map, mut index, kind) = microesnext_iterators::state(arena, iterator)?;
    if kind != ENTRIES {
        return Err(Error::Type);
    }
    let entry = microesnext_collections::next_from(arena, map, &mut index)?;
    microesnext_iterators::set_index(arena, iterator, index)?;
    let Some((key, value)) = entry else {
        return Ok(None);
    };
    let pair = microesnext_arrays::new(arena)?;
    let pair = microesnext_arrays::push(arena, pair, key)?;
    microesnext_arrays::push(arena, pair, value).map(Some)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allocates_ordered_pairs_and_skips_deleted_entries() {
        let mut memory = [0; 192];
        let mut arena = Arena::new(&mut memory);
        let one = Value::from_i30(1).unwrap();
        let ten = Value::from_i30(10).unwrap();
        let two = Value::from_i30(2).unwrap();
        let twenty = Value::from_i30(20).unwrap();
        let map = microesnext_collections::new_map(&mut arena).unwrap();
        let map = microesnext_collections::set(&mut arena, map, one, ten).unwrap();
        let map = microesnext_collections::set(&mut arena, map, two, twenty).unwrap();
        let iterator = new(&mut arena, map).unwrap();

        assert_eq!(
            microesnext_collection_iterators::next(&mut arena, iterator),
            Err(Error::Type)
        );

        let pair = next(&mut arena, iterator).unwrap().unwrap();
        assert_eq!(microesnext_arrays::get(&arena, pair, 0), Ok(one));
        assert_eq!(microesnext_arrays::get(&arena, pair, 1), Ok(ten));
        assert!(microesnext_collections::delete(&mut arena, map, two).unwrap());
        assert_eq!(next(&mut arena, iterator), Ok(None));
    }
}
