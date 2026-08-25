#![no_std]

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, HeapRef, Value};

const INITIAL_CAPACITY: usize = 8;
const TABLE_HEADER: usize = 2;

pub fn new_weak_map(arena: &mut Arena<'_>) -> Result<Value, Error> {
    new_collection(arena, BlockKind::WeakMap)
}

pub fn new_weak_set(arena: &mut Arena<'_>) -> Result<Value, Error> {
    new_collection(arena, BlockKind::WeakSet)
}

pub fn set(
    arena: &mut Arena<'_>,
    collection: Value,
    key: Value,
    value: Value,
) -> Result<Value, Error> {
    require_object_key(arena, key)?;
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
        let collection = live[0].as_ref().ok_or(Error::Type)?;
        arena.set_value(collection, 0, Value::from_ref(table))?;
    }
    arena.set_value(table, TABLE_HEADER + used * 2, live[1])?;
    arena.set_value(table, TABLE_HEADER + used * 2 + 1, live[2])?;
    count += 1;
    used += 1;
    arena.set_value(table, 0, i30(count)?)?;
    arena.set_value(table, 1, i30(used)?)?;
    Ok(live[0])
}

pub fn add(arena: &mut Arena<'_>, weak_set: Value, key: Value) -> Result<Value, Error> {
    require_kind(arena, weak_set, BlockKind::WeakSet)?;
    set(arena, weak_set, key, Value::UNDEFINED)
}

pub fn get(arena: &Arena<'_>, weak_map: Value, key: Value) -> Result<Value, Error> {
    require_kind(arena, weak_map, BlockKind::WeakMap)?;
    if key.as_ref().is_none() {
        return Ok(Value::UNDEFINED);
    }
    let table = table_ref(arena, weak_map)?;
    let Some(index) = find(arena, table, key)? else {
        return Ok(Value::UNDEFINED);
    };
    Ok(Value::from_raw(
        arena.values(table)?[TABLE_HEADER + index * 2 + 1],
    ))
}

pub fn has(arena: &Arena<'_>, collection: Value, key: Value) -> Result<bool, Error> {
    if key.as_ref().is_none() {
        return Ok(false);
    }
    Ok(find(arena, table_ref(arena, collection)?, key)?.is_some())
}

pub fn delete(arena: &mut Arena<'_>, collection: Value, key: Value) -> Result<bool, Error> {
    if key.as_ref().is_none() {
        return Ok(false);
    }
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

pub fn len(arena: &Arena<'_>, collection: Value) -> Result<usize, Error> {
    Ok(table_state(arena, table_ref(arena, collection)?)?.0)
}

fn new_collection(arena: &mut Arena<'_>, kind: BlockKind) -> Result<Value, Error> {
    let table = arena.allocate_repeated_values(
        BlockKind::WeakTable,
        &mut [i30(0)?, i30(0)?],
        INITIAL_CAPACITY * 2,
        Value::EMPTY,
        &mut [],
    )?;
    let collection = arena.allocate_values(kind, &mut [Value::from_ref(table)], &mut [])?;
    Ok(Value::from_ref(collection))
}

fn table_ref(arena: &Arena<'_>, collection: Value) -> Result<HeapRef, Error> {
    let collection = collection.as_ref().ok_or(Error::Type)?;
    if !matches!(
        arena.kind(collection)?,
        BlockKind::WeakMap | BlockKind::WeakSet
    ) {
        return Err(Error::Type);
    }
    arena
        .values(collection)?
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

fn require_object_key(arena: &Arena<'_>, key: Value) -> Result<(), Error> {
    let kind = arena.kind(key.as_ref().ok_or(Error::Type)?)?;
    if matches!(
        kind,
        BlockKind::Object
            | BlockKind::Closure
            | BlockKind::Map
            | BlockKind::Set
            | BlockKind::WeakMap
            | BlockKind::WeakSet
    ) {
        Ok(())
    } else {
        Err(Error::Type)
    }
}

fn table_state(arena: &Arena<'_>, table: HeapRef) -> Result<(usize, usize, usize), Error> {
    if arena.kind(table)? != BlockKind::WeakTable {
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
        if candidate != Value::EMPTY && candidate == key {
            return Ok(Some(index));
        }
    }
    Ok(None)
}

fn i30(value: usize) -> Result<Value, Error> {
    Value::from_i30(value as i32).ok_or(Error::OutOfMemory)
}

#[cfg(test)]
mod tests {
    use microesnext_objects::new_object;

    use super::*;

    #[test]
    fn collection_alone_does_not_retain_weak_entries() {
        let mut memory = [0; 192];
        let mut arena = Arena::with_root_capacity(&mut memory, 4);
        let weak_map = new_weak_map(&mut arena).unwrap();
        let key = new_object(&mut arena, Value::NULL).unwrap();
        let value = new_object(&mut arena, Value::NULL).unwrap();
        let weak_map = set(&mut arena, weak_map, key, value).unwrap();
        let weak_map_root = arena.retain(weak_map).unwrap();

        arena.compact(&mut []).unwrap();

        let weak_map = arena.root(weak_map_root).unwrap();
        assert_eq!(len(&arena, weak_map).unwrap(), 0);
    }

    #[test]
    fn strongly_live_key_retains_its_ephemeron_value() {
        let mut memory = [0; 192];
        let mut arena = Arena::with_root_capacity(&mut memory, 4);
        let weak_map = new_weak_map(&mut arena).unwrap();
        let key = new_object(&mut arena, Value::NULL).unwrap();
        let value = new_object(&mut arena, Value::NULL).unwrap();
        let weak_map = set(&mut arena, weak_map, key, value).unwrap();
        let weak_map_root = arena.retain(weak_map).unwrap();
        let key_root = arena.retain(key).unwrap();

        arena.compact(&mut []).unwrap();

        let weak_map = arena.root(weak_map_root).unwrap();
        let key = arena.root(key_root).unwrap();
        let value = get(&arena, weak_map, key).unwrap();
        assert_eq!(
            arena.kind(value.as_ref().unwrap()).unwrap(),
            BlockKind::Object
        );
        assert_eq!(len(&arena, weak_map).unwrap(), 1);
    }

    #[test]
    fn ephemerons_reach_a_fixed_point_across_tables() {
        let mut memory = [0; 320];
        let mut arena = Arena::with_root_capacity(&mut memory, 8);
        let first = new_weak_map(&mut arena).unwrap();
        let second = new_weak_map(&mut arena).unwrap();
        let key_one = new_object(&mut arena, Value::NULL).unwrap();
        let key_two = new_object(&mut arena, Value::NULL).unwrap();
        let final_value = new_object(&mut arena, Value::NULL).unwrap();
        let first = set(&mut arena, first, key_one, key_two).unwrap();
        let second = set(&mut arena, second, key_two, final_value).unwrap();
        let first_root = arena.retain(first).unwrap();
        let second_root = arena.retain(second).unwrap();
        let key_one_root = arena.retain(key_one).unwrap();

        arena.compact(&mut []).unwrap();

        let first = arena.root(first_root).unwrap();
        let second = arena.root(second_root).unwrap();
        let key_one = arena.root(key_one_root).unwrap();
        let key_two = get(&arena, first, key_one).unwrap();
        let final_value = get(&arena, second, key_two).unwrap();
        assert_eq!(
            arena.kind(final_value.as_ref().unwrap()).unwrap(),
            BlockKind::Object
        );
    }
}
