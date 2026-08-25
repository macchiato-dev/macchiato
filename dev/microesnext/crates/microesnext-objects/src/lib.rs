#![no_std]

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, HeapRef, Value};

/// Ordinary objects contain only a prototype and a property-table reference.
/// Property tables store interned-key/value pairs and can be replaced as they
/// grow without changing the object reference.
pub fn new_object(arena: &mut Arena<'_>, prototype: Value) -> Result<Value, Error> {
    let properties = arena.allocate_values(BlockKind::Properties, &mut [], &mut [])?;
    let object = arena.allocate_values(
        BlockKind::Object,
        &mut [prototype, Value::from_ref(properties)],
        &mut [],
    )?;
    Ok(Value::from_ref(object))
}

pub fn get(arena: &Arena<'_>, object: Value, key: Value) -> Result<Value, Error> {
    let properties = properties_ref(arena, object)?;
    let entries = arena.values(properties)?;
    if entries.len() % 2 != 0 {
        return Err(Error::DanglingReference);
    }
    for pair in entries.chunks_exact(2) {
        if Value::from_raw(pair[0]) == key {
            return Ok(Value::from_raw(pair[1]));
        }
    }
    Ok(Value::UNDEFINED)
}

pub fn set(arena: &mut Arena<'_>, object: Value, key: Value, value: Value) -> Result<Value, Error> {
    let properties = properties_ref(arena, object)?;
    let entries = arena.values(properties)?;
    if entries.len() % 2 != 0 {
        return Err(Error::DanglingReference);
    }
    for index in (0..entries.len()).step_by(2) {
        if Value::from_raw(entries[index]) == key {
            arena.set_value(properties, index + 1, value)?;
            return Ok(object);
        }
    }

    let mut live = [object, key, value];
    let properties = properties_ref(arena, live[0])?;
    let (object_root, pair) = live.split_at_mut(1);
    let properties = arena.extend_values(properties, pair, object_root)?;
    let object = live[0].as_ref().ok_or(Error::Type)?;
    arena.set_value(object, 1, Value::from_ref(properties))?;
    Ok(live[0])
}

pub fn prototype(arena: &Arena<'_>, object: Value) -> Result<Value, Error> {
    let object = object.as_ref().ok_or(Error::Type)?;
    if arena.kind(object)? != BlockKind::Object {
        return Err(Error::Type);
    }
    arena
        .values(object)?
        .first()
        .copied()
        .map(Value::from_raw)
        .ok_or(Error::DanglingReference)
}

fn properties_ref(arena: &Arena<'_>, object: Value) -> Result<HeapRef, Error> {
    let object = object.as_ref().ok_or(Error::Type)?;
    if arena.kind(object)? != BlockKind::Object {
        return Err(Error::Type);
    }
    let fields = arena.values(object)?;
    if fields.len() != 2 {
        return Err(Error::DanglingReference);
    }
    Value::from_raw(fields[1]).as_ref().ok_or(Error::Type)
}

#[cfg(test)]
mod tests {
    use microesnext_strings::Atoms;

    use super::*;

    #[test]
    fn atoms_and_objects_survive_relocation() {
        let mut memory = [0; 80];
        let mut arena = Arena::with_root_capacity(&mut memory, 4);
        let mut atoms = Atoms::new(&mut arena).unwrap();
        let title = atoms.intern(&mut arena, b"title").unwrap();
        assert_eq!(atoms.intern(&mut arena, b"title").unwrap(), title);
        let object = new_object(&mut arena, Value::NULL).unwrap();
        let object = set(&mut arena, object, title, Value::from_i30(42).unwrap()).unwrap();
        let object_root = arena.retain(object).unwrap();

        arena.compact(&mut []).unwrap();

        let object = arena.root(object_root).unwrap();
        let title = atoms.intern(&mut arena, b"title").unwrap();
        assert_eq!(get(&arena, object, title).unwrap().as_i30(), Some(42));
        assert_eq!(prototype(&arena, object).unwrap(), Value::NULL);
        atoms.release(&mut arena).unwrap();
    }
}
