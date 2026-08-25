#![no_std]

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, HeapRef, Value};

pub fn is_object(arena: &Arena<'_>, value: Value) -> bool {
    value
        .as_ref()
        .and_then(|reference| arena.kind(reference).ok())
        .is_some_and(is_object_kind)
}

/// Ordinary objects contain only a prototype and a property-table reference.
/// Property tables store interned-key/value pairs and can be replaced as they
/// grow without changing the object reference.
pub fn new_object(arena: &mut Arena<'_>, prototype: Value) -> Result<Value, Error> {
    if prototype != Value::NULL {
        object_ref(arena, prototype)?;
    }
    let properties = arena.allocate_values(BlockKind::Properties, &mut [], &mut [])?;
    let object = arena.allocate_values(
        BlockKind::Object,
        &mut [prototype, Value::from_ref(properties)],
        &mut [],
    )?;
    Ok(Value::from_ref(object))
}

pub fn get(arena: &Arena<'_>, object: Value, key: Value) -> Result<Value, Error> {
    let mut object = object;
    loop {
        if let Some(value) = get_own(arena, object, key)? {
            return Ok(value);
        }
        object = prototype(arena, object)?;
        if object == Value::NULL {
            return Ok(Value::UNDEFINED);
        }
    }
}

pub fn get_own(arena: &Arena<'_>, object: Value, key: Value) -> Result<Option<Value>, Error> {
    let properties = properties_ref(arena, object)?;
    let entries = arena.values(properties)?;
    if entries.len() % 2 != 0 {
        return Err(Error::DanglingReference);
    }
    for pair in entries.chunks_exact(2) {
        if Value::from_raw(pair[0]) == key {
            return Ok(Some(Value::from_raw(pair[1])));
        }
    }
    Ok(None)
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
    let object = object_ref(arena, object)?;
    arena
        .values(object)?
        .first()
        .copied()
        .map(Value::from_raw)
        .ok_or(Error::DanglingReference)
}

fn properties_ref(arena: &Arena<'_>, object: Value) -> Result<HeapRef, Error> {
    let object = object_ref(arena, object)?;
    let fields = arena.values(object)?;
    if fields.len() != object_field_count(arena.kind(object)?) {
        return Err(Error::DanglingReference);
    }
    Value::from_raw(fields[1]).as_ref().ok_or(Error::Type)
}

fn object_ref(arena: &Arena<'_>, object: Value) -> Result<HeapRef, Error> {
    let object = object.as_ref().ok_or(Error::Type)?;
    if !is_object_kind(arena.kind(object)?) {
        return Err(Error::Type);
    }
    Ok(object)
}

#[inline]
const fn is_object_kind(kind: BlockKind) -> bool {
    match kind {
        BlockKind::Object => true,
        #[cfg(feature = "callable-objects")]
        BlockKind::CallableObject => true,
        _ => false,
    }
}

#[inline]
const fn object_field_count(kind: BlockKind) -> usize {
    match kind {
        BlockKind::Object => 2,
        #[cfg(feature = "callable-objects")]
        BlockKind::CallableObject => 3,
        _ => 0,
    }
}

#[cfg(test)]
mod tests {
    use microesnext_atoms::Atoms;

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

    #[test]
    fn stack_roots_keep_an_interned_property_key_current() {
        let mut memory = [0; 80];
        let mut arena = Arena::with_root_capacity(&mut memory, 4);
        let mut atoms = Atoms::new(&mut arena).unwrap();
        let object = new_object(&mut arena, Value::NULL).unwrap();
        arena.push(object).unwrap();
        let key = atoms.intern(&mut arena, b"answer").unwrap();
        arena.push(key).unwrap();
        arena.push(Value::from_i30(42).unwrap()).unwrap();

        let value = arena.pop().unwrap();
        let key = arena.pop().unwrap();
        let object = arena.pop().unwrap();
        let object = set(&mut arena, object, key, value).unwrap();
        arena.push(object).unwrap();
        let key = atoms.intern(&mut arena, b"answer").unwrap();
        let object = arena.pop().unwrap();

        assert_eq!(get(&arena, object, key).unwrap().as_i30(), Some(42));
    }

    #[test]
    fn reads_inherited_properties_without_native_recursion() {
        let mut memory = [0; 112];
        let mut arena = Arena::with_root_capacity(&mut memory, 4);
        let mut atoms = Atoms::new(&mut arena).unwrap();
        let key = atoms.intern(&mut arena, b"iterator").unwrap();
        let grandparent = new_object(&mut arena, Value::NULL).unwrap();
        let grandparent = set(&mut arena, grandparent, key, Value::TRUE).unwrap();
        let parent = new_object(&mut arena, grandparent).unwrap();
        let child = new_object(&mut arena, parent).unwrap();

        assert_eq!(get(&arena, child, key), Ok(Value::TRUE));
        assert_eq!(get_own(&arena, child, key), Ok(None));
        assert_eq!(get_own(&arena, grandparent, key), Ok(Some(Value::TRUE)));
    }

    #[test]
    fn rejects_non_object_prototypes() {
        let mut memory = [0; 24];
        let mut arena = Arena::new(&mut memory);
        assert_eq!(new_object(&mut arena, Value::TRUE), Err(Error::Type));
    }
}
