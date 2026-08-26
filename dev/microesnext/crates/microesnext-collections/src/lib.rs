#![no_std]

#[cfg(feature = "weak")]
pub mod weak;

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, HeapRef, Value};

const INITIAL_CAPACITY: usize = 8;
const TABLE_HEADER: usize = 2;

pub fn new_map(arena: &mut Arena<'_>) -> Result<Value, Error> {
    new_collection(arena, BlockKind::Map)
}

pub fn new_set(arena: &mut Arena<'_>) -> Result<Value, Error> {
    new_collection(arena, BlockKind::Set)
}

pub fn set(
    arena: &mut Arena<'_>,
    collection: Value,
    key: Value,
    value: Value,
) -> Result<Value, Error> {
    let table = table_ref(arena, collection)?;
    if let Some(index) = find(arena, table, key)? {
        arena.set_value(table, TABLE_HEADER + index * 2 + 1, value)?;
        return Ok(collection);
    }

    let mut live = [collection, key, value];
    let mut table = table_ref(arena, live[0])?;
    let (mut count, mut used, capacity) = table_state(arena, table)?;
    if used == capacity {
        table = arena.extend_repeated_values(table, capacity * 2, Value::EMPTY, &mut live)?;
        let collection_ref = live[0].as_ref().ok_or(Error::Type)?;
        arena.set_value(collection_ref, 0, Value::from_ref(table))?;
    }
    arena.set_value(table, TABLE_HEADER + used * 2, live[1])?;
    arena.set_value(table, TABLE_HEADER + used * 2 + 1, live[2])?;
    count += 1;
    used += 1;
    arena.set_value(table, 0, i30(count)?)?;
    arena.set_value(table, 1, i30(used)?)?;
    Ok(live[0])
}

pub fn add(arena: &mut Arena<'_>, set_value: Value, value: Value) -> Result<Value, Error> {
    require_kind(arena, set_value, BlockKind::Set)?;
    set(arena, set_value, value, value)
}

pub fn get(arena: &Arena<'_>, map: Value, key: Value) -> Result<Value, Error> {
    require_kind(arena, map, BlockKind::Map)?;
    let table = table_ref(arena, map)?;
    let Some(index) = find(arena, table, key)? else {
        return Ok(Value::UNDEFINED);
    };
    Ok(Value::from_raw(
        arena.values(table)?[TABLE_HEADER + index * 2 + 1],
    ))
}

pub fn has(arena: &Arena<'_>, collection: Value, key: Value) -> Result<bool, Error> {
    let table = table_ref(arena, collection)?;
    Ok(find(arena, table, key)?.is_some())
}

pub fn delete(arena: &mut Arena<'_>, collection: Value, key: Value) -> Result<bool, Error> {
    let table = table_ref(arena, collection)?;
    let Some(index) = find(arena, table, key)? else {
        return Ok(false);
    };
    let (count, _, _) = table_state(arena, table)?;
    arena.set_value(table, TABLE_HEADER + index * 2, Value::EMPTY)?;
    arena.set_value(table, TABLE_HEADER + index * 2 + 1, Value::UNDEFINED)?;
    arena.set_value(table, 0, i30(count - 1)?)?;
    Ok(true)
}

pub fn clear(arena: &mut Arena<'_>, collection: Value) -> Result<(), Error> {
    let table = table_ref(arena, collection)?;
    let (_, used, _) = table_state(arena, table)?;
    for index in 0..used {
        arena.set_value(table, TABLE_HEADER + index * 2, Value::EMPTY)?;
        arena.set_value(table, TABLE_HEADER + index * 2 + 1, Value::UNDEFINED)?;
    }
    arena.set_value(table, 0, i30(0)?)?;
    arena.set_value(table, 1, i30(0)?)?;
    Ok(())
}

pub fn len(arena: &Arena<'_>, collection: Value) -> Result<usize, Error> {
    Ok(table_state(arena, table_ref(arena, collection)?)?.0)
}

/// Stateful index used by live iterators. Deletions are skipped and values
/// appended after cursor creation remain visible.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct Cursor {
    index: usize,
}

impl Cursor {
    pub fn next(
        &mut self,
        arena: &Arena<'_>,
        collection: Value,
    ) -> Result<Option<(Value, Value)>, Error> {
        next_from(arena, collection, &mut self.index)
    }
}

pub fn next_from(
    arena: &Arena<'_>,
    collection: Value,
    index: &mut usize,
) -> Result<Option<(Value, Value)>, Error> {
    let table = table_ref(arena, collection)?;
    let (_, used, _) = table_state(arena, table)?;
    let entries = arena.values(table)?;
    while *index < used {
        let current = *index;
        *index += 1;
        let key = Value::from_raw(entries[TABLE_HEADER + current * 2]);
        if key != Value::EMPTY {
            return Ok(Some((
                key,
                Value::from_raw(entries[TABLE_HEADER + current * 2 + 1]),
            )));
        }
    }
    Ok(None)
}

fn new_collection(arena: &mut Arena<'_>, kind: BlockKind) -> Result<Value, Error> {
    let table = arena.allocate_repeated_values(
        BlockKind::CollectionTable,
        &mut [i30(0)?, i30(0)?],
        INITIAL_CAPACITY * 2,
        Value::EMPTY,
        &mut [],
    )?;
    let collection = arena.allocate_values(kind, &mut [Value::from_ref(table)], &mut [])?;
    Ok(Value::from_ref(collection))
}

fn table_ref(arena: &Arena<'_>, collection: Value) -> Result<HeapRef, Error> {
    let reference = collection.as_ref().ok_or(Error::Type)?;
    let kind = arena.kind(reference)?;
    if !matches!(kind, BlockKind::Map | BlockKind::Set) {
        return Err(Error::Type);
    }
    arena
        .values(reference)?
        .first()
        .copied()
        .map(Value::from_raw)
        .and_then(Value::as_ref)
        .ok_or(Error::DanglingReference)
}

fn require_kind(arena: &Arena<'_>, collection: Value, expected: BlockKind) -> Result<(), Error> {
    if arena.kind(collection.as_ref().ok_or(Error::Type)?)? == expected {
        Ok(())
    } else {
        Err(Error::Type)
    }
}

fn table_state(arena: &Arena<'_>, table: HeapRef) -> Result<(usize, usize, usize), Error> {
    if arena.kind(table)? != BlockKind::CollectionTable {
        return Err(Error::Type);
    }
    let values = arena.values(table)?;
    if values.len() < TABLE_HEADER || (values.len() - TABLE_HEADER) % 2 != 0 {
        return Err(Error::DanglingReference);
    }
    let count = Value::from_raw(values[0]).as_i30().ok_or(Error::Type)? as usize;
    let used = Value::from_raw(values[1]).as_i30().ok_or(Error::Type)? as usize;
    let capacity = (values.len() - TABLE_HEADER) / 2;
    if count > used || used > capacity {
        return Err(Error::DanglingReference);
    }
    Ok((count, used, capacity))
}

fn find(arena: &Arena<'_>, table: HeapRef, key: Value) -> Result<Option<usize>, Error> {
    let (_, used, _) = table_state(arena, table)?;
    let entries = arena.values(table)?;
    for index in 0..used {
        let candidate = Value::from_raw(entries[TABLE_HEADER + index * 2]);
        if candidate != Value::EMPTY && keys_equal(arena, candidate, key)? {
            return Ok(Some(index));
        }
    }
    Ok(None)
}

#[inline(always)]
fn keys_equal(arena: &Arena<'_>, left: Value, right: Value) -> Result<bool, Error> {
    #[cfg(any(feature = "number-keys", feature = "string-keys"))]
    return microesnext_equality::same_value_zero(arena, left, right);
    #[cfg(not(any(feature = "number-keys", feature = "string-keys")))]
    {
        let _ = arena;
        Ok(left == right)
    }
}

fn i30(value: usize) -> Result<Value, Error> {
    Value::from_i30(value as i32).ok_or(Error::OutOfMemory)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ordered_map_updates_and_iterates_live_entries() {
        let mut memory = [0; 160];
        let mut arena = Arena::new(&mut memory);
        let map = new_map(&mut arena).unwrap();
        let map = set(&mut arena, map, i30(1).unwrap(), i30(10).unwrap()).unwrap();
        let map = set(&mut arena, map, i30(2).unwrap(), i30(20).unwrap()).unwrap();
        let mut cursor = Cursor::default();
        assert_eq!(
            cursor.next(&arena, map).unwrap().unwrap().0.as_i30(),
            Some(1)
        );
        assert!(delete(&mut arena, map, i30(2).unwrap()).unwrap());
        let map = set(&mut arena, map, i30(3).unwrap(), i30(30).unwrap()).unwrap();
        assert_eq!(
            cursor.next(&arena, map).unwrap().unwrap().0.as_i30(),
            Some(3)
        );
        assert_eq!(cursor.next(&arena, map).unwrap(), None);
        assert_eq!(
            get(&arena, map, i30(3).unwrap()).unwrap().as_i30(),
            Some(30)
        );
        assert_eq!(len(&arena, map).unwrap(), 2);
    }

    #[test]
    fn set_deduplicates_values() {
        let mut memory = [0; 96];
        let mut arena = Arena::new(&mut memory);
        let set_value = new_set(&mut arena).unwrap();
        let set_value = add(&mut arena, set_value, i30(7).unwrap()).unwrap();
        let set_value = add(&mut arena, set_value, i30(7).unwrap()).unwrap();
        assert_eq!(len(&arena, set_value).unwrap(), 1);
        assert!(has(&arena, set_value, i30(7).unwrap()).unwrap());
    }

    #[test]
    fn geometric_growth_and_compaction_preserve_entries() {
        let mut memory = [0; 256];
        let mut arena = Arena::with_root_capacity(&mut memory, 2);
        let mut map = new_map(&mut arena).unwrap();
        for key in 0..9 {
            map = set(&mut arena, map, i30(key).unwrap(), i30(key + 100).unwrap()).unwrap();
        }
        let root = arena.retain(map).unwrap();

        arena.compact(&mut []).unwrap();

        map = arena.root(root).unwrap();
        assert_eq!(len(&arena, map).unwrap(), 9);
        assert_eq!(
            get(&arena, map, i30(8).unwrap()).unwrap().as_i30(),
            Some(108)
        );
    }

    #[cfg(feature = "number-keys")]
    #[test]
    fn numeric_keys_use_same_value_zero_when_numbers_are_composed() {
        let mut memory = [0; 128];
        let mut arena = Arena::new(&mut memory);
        let map = new_map(&mut arena).unwrap();
        let nan_a = microesnext_numbers::new(&mut arena, f64::NAN).unwrap();
        let nan_b = microesnext_numbers::new(&mut arena, f64::NAN).unwrap();
        let map = set(&mut arena, map, nan_a, Value::TRUE).unwrap();
        assert_eq!(get(&arena, map, nan_b), Ok(Value::TRUE));
        let negative_zero = microesnext_numbers::new(&mut arena, -0.0).unwrap();
        let map = set(&mut arena, map, negative_zero, Value::FALSE).unwrap();
        assert_eq!(
            get(&arena, map, Value::from_i30(0).unwrap()),
            Ok(Value::FALSE)
        );
    }

    #[cfg(feature = "string-keys")]
    #[test]
    fn string_keys_compare_by_content_when_strings_are_composed() {
        let mut memory = [0; 128];
        let mut arena = Arena::new(&mut memory);
        let map = new_map(&mut arena).unwrap();
        let left = microesnext_strings::new(&mut arena, b"key").unwrap();
        let right = microesnext_strings::new(&mut arena, b"key").unwrap();
        let map = set(&mut arena, map, left, Value::TRUE).unwrap();
        assert_eq!(get(&arena, map, right), Ok(Value::TRUE));
    }
}
