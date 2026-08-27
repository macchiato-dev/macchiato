#[cfg(feature = "array-assignment-expressions")]
pub mod assignment_expressions;
#[cfg(feature = "array-iterators")]
pub mod iterators;

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, HeapRef, Value};

const INITIAL_CAPACITY: usize = 8;
const LENGTH: usize = 0;
const STORAGE: usize = 1;
const PROPERTIES: usize = 2;

pub fn is_array(arena: &Arena<'_>, value: Value) -> bool {
    value
        .as_ref()
        .and_then(|reference| arena.kind(reference).ok())
        == Some(BlockKind::Array)
}

pub fn new(arena: &mut Arena<'_>) -> Result<Value, Error> {
    let storage = arena.allocate_repeated_values(
        BlockKind::ArrayStorage,
        &mut [],
        INITIAL_CAPACITY,
        Value::EMPTY,
        &mut [],
    )?;
    let properties = arena.allocate_values(BlockKind::Properties, &mut [], &mut [])?;
    let mut fields = [i30(0)?, Value::from_ref(storage), Value::from_ref(properties)];
    let array = arena.allocate_values(BlockKind::Array, &mut fields, &mut [])?;
    Ok(Value::from_ref(array))
}

pub fn len(arena: &Arena<'_>, array: Value) -> Result<usize, Error> {
    let array = array_ref(arena, array)?;
    arena
        .values(array)?
        .get(LENGTH)
        .copied()
        .map(Value::from_raw)
        .and_then(Value::as_i30)
        .and_then(|length| usize::try_from(length).ok())
        .ok_or(Error::DanglingReference)
}

pub fn get(arena: &Arena<'_>, array: Value, index: usize) -> Result<Value, Error> {
    if index >= len(arena, array)? {
        return Ok(Value::UNDEFINED);
    }
    let value = Value::from_raw(arena.values(storage_ref(arena, array)?)?[index]);
    Ok(if value == Value::EMPTY {
        Value::UNDEFINED
    } else {
        value
    })
}

pub fn set(
    arena: &mut Arena<'_>,
    array: Value,
    index: usize,
    value: Value,
) -> Result<Value, Error> {
    if index >= (1 << 29) - 1 {
        return Err(Error::OutOfMemory);
    }
    let mut live = [array, value];
    let mut storage = storage_ref(arena, live[0])?;
    let capacity = arena.values(storage)?.len();
    if index >= capacity {
        let required = index + 1;
        let mut next_capacity = capacity.max(1);
        while next_capacity < required {
            next_capacity = next_capacity.checked_mul(2).ok_or(Error::OutOfMemory)?;
        }
        storage = arena.extend_repeated_values(
            storage,
            next_capacity - capacity,
            Value::EMPTY,
            &mut live,
        )?;
        let array_ref = array_ref(arena, live[0])?;
        arena.set_value(array_ref, STORAGE, Value::from_ref(storage))?;
    }
    arena.set_value(storage, index, live[1])?;
    let old_length = len(arena, live[0])?;
    if index >= old_length {
        let array_ref = array_ref(arena, live[0])?;
        arena.set_value(array_ref, LENGTH, i30(index + 1)?)?;
    }
    Ok(live[0])
}

pub fn push(arena: &mut Arena<'_>, array: Value, value: Value) -> Result<Value, Error> {
    let index = len(arena, array)?;
    set(arena, array, index, value)
}

pub fn pop(arena: &mut Arena<'_>, array: Value) -> Result<Value, Error> {
    let length = len(arena, array)?;
    if length == 0 {
        return Ok(Value::UNDEFINED);
    }
    let index = length - 1;
    let storage = storage_ref(arena, array)?;
    let value = Value::from_raw(arena.values(storage)?[index]);
    arena.set_value(storage, index, Value::EMPTY)?;
    let array = array_ref(arena, array)?;
    arena.set_value(array, LENGTH, i30(index)?)?;
    Ok(if value == Value::EMPTY {
        Value::UNDEFINED
    } else {
        value
    })
}

pub fn delete(arena: &mut Arena<'_>, array: Value, index: usize) -> Result<bool, Error> {
    if index >= len(arena, array)? {
        return Ok(false);
    }
    let storage = storage_ref(arena, array)?;
    let existed = Value::from_raw(arena.values(storage)?[index]) != Value::EMPTY;
    arena.set_value(storage, index, Value::EMPTY)?;
    Ok(existed)
}

pub fn set_len(arena: &mut Arena<'_>, array: Value, length: usize) -> Result<Value, Error> {
    if length >= (1 << 29) { return Err(Error::OutOfMemory); }
    let old = len(arena, array)?;
    let storage = storage_ref(arena, array)?;
    let capacity = arena.values(storage)?.len();
    for index in length..old.min(capacity) {
        arena.set_value(storage, index, Value::EMPTY)?;
    }
    let reference = array_ref(arena, array)?;
    arena.set_value(reference, LENGTH, i30(length)?)?;
    Ok(array)
}

pub fn get_property(arena: &Arena<'_>, array: Value, key: Value) -> Result<Option<Value>, Error> {
    let properties = properties_ref(arena, array)?;
    let entries = arena.values(properties)?;
    for pair in entries.chunks_exact(2) {
        if keys_equal(arena, Value::from_raw(pair[0]), key)? {
            return Ok(Some(Value::from_raw(pair[1])));
        }
    }
    Ok(None)
}

pub fn set_property(
    arena: &mut Arena<'_>, array: Value, key: Value, value: Value,
) -> Result<Value, Error> {
    let properties = properties_ref(arena, array)?;
    let entries = arena.values(properties)?;
    for index in (0..entries.len()).step_by(2) {
        if keys_equal(arena, Value::from_raw(entries[index]), key)? {
            arena.set_value(properties, index + 1, value)?;
            return Ok(array);
        }
    }
    let mut live = [array, key, value];
    let properties = properties_ref(arena, live[0])?;
    let (array_root, pair) = live.split_at_mut(1);
    let properties = arena.extend_values(properties, pair, array_root)?;
    let array = array_ref(arena, live[0])?;
    arena.set_value(array, PROPERTIES, Value::from_ref(properties))?;
    Ok(live[0])
}

fn keys_equal(arena: &Arena<'_>, left: Value, right: Value) -> Result<bool, Error> {
    if left == right { return Ok(true); }
    let (Some(left), Some(right)) = (left.as_ref(), right.as_ref()) else { return Ok(false); };
    let string = |kind| matches!(kind, BlockKind::Bytes | BlockKind::String);
    if !string(arena.kind(left)?) || !string(arena.kind(right)?) { return Ok(false); }
    Ok(arena.bytes(left)? == arena.bytes(right)?)
}

fn array_ref(arena: &Arena<'_>, array: Value) -> Result<HeapRef, Error> {
    let array = array.as_ref().ok_or(Error::Type)?;
    if arena.kind(array)? != BlockKind::Array || arena.values(array)?.len() != 3 {
        return Err(Error::Type);
    }
    Ok(array)
}

fn properties_ref(arena: &Arena<'_>, array: Value) -> Result<HeapRef, Error> {
    let array = array_ref(arena, array)?;
    let properties = Value::from_raw(arena.values(array)?[PROPERTIES])
        .as_ref().ok_or(Error::DanglingReference)?;
    if arena.kind(properties)? != BlockKind::Properties { return Err(Error::DanglingReference); }
    Ok(properties)
}

fn storage_ref(arena: &Arena<'_>, array: Value) -> Result<HeapRef, Error> {
    let array = array_ref(arena, array)?;
    let storage = arena
        .values(array)?
        .get(STORAGE)
        .copied()
        .map(Value::from_raw)
        .and_then(Value::as_ref)
        .ok_or(Error::DanglingReference)?;
    if arena.kind(storage)? != BlockKind::ArrayStorage {
        return Err(Error::DanglingReference);
    }
    Ok(storage)
}

fn i30(value: usize) -> Result<Value, Error> {
    let value = i32::try_from(value).map_err(|_| Error::OutOfMemory)?;
    Value::from_i30(value).ok_or(Error::OutOfMemory)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn integer(value: i32) -> Value {
        Value::from_i30(value).unwrap()
    }

    #[test]
    fn grows_geometrically_and_preserves_holes() {
        let mut memory = [0; 160];
        let mut arena = Arena::new(&mut memory);
        let array = new(&mut arena).unwrap();
        let array = set(&mut arena, array, 12, integer(42)).unwrap();
        assert_eq!(len(&arena, array).unwrap(), 13);
        assert_eq!(get(&arena, array, 3).unwrap(), Value::UNDEFINED);
        assert_eq!(get(&arena, array, 12).unwrap(), integer(42));
    }

    #[test]
    fn push_pop_and_delete_follow_array_length_rules() {
        let mut memory = [0; 96];
        let mut arena = Arena::new(&mut memory);
        let array = new(&mut arena).unwrap();
        let array = push(&mut arena, array, integer(7)).unwrap();
        let array = push(&mut arena, array, integer(9)).unwrap();
        assert!(delete(&mut arena, array, 0).unwrap());
        assert_eq!(len(&arena, array).unwrap(), 2);
        assert_eq!(pop(&mut arena, array).unwrap(), integer(9));
        assert_eq!(pop(&mut arena, array).unwrap(), Value::UNDEFINED);
        assert_eq!(len(&arena, array).unwrap(), 0);
    }

    #[test]
    fn named_properties_do_not_change_index_storage_or_length() {
        let mut memory = [0; 128];
        let mut arena = Arena::new(&mut memory);
        let array = new(&mut arena).unwrap();
        let key = microesnext_values::strings::new(&mut arena, b"next").unwrap();
        let array = set_property(&mut arena, array, key, integer(42)).unwrap();
        assert_eq!(get_property(&arena, array, key), Ok(Some(integer(42))));
        assert_eq!(len(&arena, array), Ok(0));
    }

    #[test]
    fn relocated_array_and_storage_keep_their_elements() {
        let mut memory = [0; 192];
        let mut arena = Arena::with_root_capacity(&mut memory, 1);
        let mut array = new(&mut arena).unwrap();
        for value in 0..12 {
            array = push(&mut arena, array, integer(value)).unwrap();
        }
        let root = arena.retain(array).unwrap();
        arena.compact(&mut []).unwrap();
        array = arena.root(root).unwrap();
        assert_eq!(len(&arena, array).unwrap(), 12);
        assert_eq!(get(&arena, array, 11).unwrap(), integer(11));
    }
}
