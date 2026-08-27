#![no_std]

#[cfg(feature = "arrays")]
pub mod arrays;
#[cfg(feature = "collections")]
pub mod collections;
#[cfg(feature = "iterators")]
pub mod iterators;
#[cfg(feature = "object-key-iterators")]
pub mod object_key_iterators;

#[cfg(feature = "assignment-expressions")]
pub mod assignment_expressions;
#[cfg(feature = "callable-objects")]
pub mod callable;
#[cfg(feature = "class-constructors")]
pub mod class_constructor;
#[cfg(feature = "construction")]
pub mod construction;
#[cfg(feature = "getters")]
pub mod getters;
#[cfg(feature = "instanceof")]
pub mod instanceof;
#[cfg(feature = "method-calls")]
pub mod method_calls;
#[cfg(feature = "prototype-chain")]
pub mod prototype_chain;
#[cfg(feature = "recursive-constructors")]
pub mod recursive_constructor;

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, HeapRef, Value};

#[cfg(not(any(feature = "callable-objects", feature = "class-constructors")))]
pub fn is_object(arena: &Arena<'_>, value: Value) -> bool {
    value
        .as_ref()
        .and_then(|reference| arena.kind(reference).ok())
        == Some(BlockKind::Object)
}

#[cfg(any(feature = "callable-objects", feature = "class-constructors"))]
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

pub fn has(arena: &Arena<'_>, object: Value, key: Value) -> Result<bool, Error> {
    let mut object = object;
    loop {
        if get_own(arena, object, key)?.is_some() {
            return Ok(true);
        }
        object = prototype(arena, object)?;
        if object == Value::NULL {
            return Ok(false);
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
        if property_keys_equal(arena, Value::from_raw(pair[0]), key)? {
            return Ok(Some(Value::from_raw(pair[1])));
        }
    }
    Ok(None)
}

#[cfg(any(feature = "object-key-iterators", feature = "object-spread"))]
pub fn own_property_count(arena: &Arena<'_>, object: Value) -> Result<usize, Error> {
    let entries = arena.values(properties_ref(arena, object)?)?;
    if entries.len() % 2 != 0 {
        return Err(Error::DanglingReference);
    }
    Ok(entries
        .chunks_exact(2)
        .filter(|pair| Value::from_raw(pair[0]) != Value::EMPTY)
        .count())
}

#[cfg(any(feature = "object-key-iterators", feature = "object-spread"))]
pub fn own_property_key(arena: &Arena<'_>, object: Value, index: usize) -> Result<Value, Error> {
    let entries = arena.values(properties_ref(arena, object)?)?;
    entries
        .chunks_exact(2)
        .filter_map(|pair| {
            let key = Value::from_raw(pair[0]);
            (key != Value::EMPTY).then_some(key)
        })
        .nth(index)
        .ok_or(Error::DanglingReference)
}

pub fn set(arena: &mut Arena<'_>, object: Value, key: Value, value: Value) -> Result<Value, Error> {
    let properties = properties_ref(arena, object)?;
    let entries = arena.values(properties)?;
    if entries.len() % 2 != 0 {
        return Err(Error::DanglingReference);
    }
    for index in (0..entries.len()).step_by(2) {
        if property_keys_equal(arena, Value::from_raw(entries[index]), key)? {
            arena.set_value(properties, index + 1, value)?;
            return Ok(object);
        }
    }

    for index in (0..entries.len()).step_by(2) {
        if Value::from_raw(entries[index]) == Value::EMPTY {
            arena.set_value(properties, index, key)?;
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

pub fn delete(arena: &mut Arena<'_>, object: Value, key: Value) -> Result<bool, Error> {
    let properties = properties_ref(arena, object)?;
    let entries = arena.values(properties)?;
    if entries.len() % 2 != 0 {
        return Err(Error::DanglingReference);
    }
    for index in (0..entries.len()).step_by(2) {
        if property_keys_equal(arena, Value::from_raw(entries[index]), key)? {
            arena.set_value(properties, index, Value::EMPTY)?;
            arena.set_value(properties, index + 1, Value::EMPTY)?;
            return Ok(true);
        }
    }
    Ok(true)
}

/// Property-name strings compare by contents, even when one came from the
/// atom table and the other was constructed dynamically. Symbols and all
/// other keys retain identity semantics.
fn property_keys_equal(arena: &Arena<'_>, left: Value, right: Value) -> Result<bool, Error> {
    if left == right {
        return Ok(true);
    }
    let (Some(left), Some(right)) = (left.as_ref(), right.as_ref()) else {
        return Ok(false);
    };
    let is_string = |kind| matches!(kind, BlockKind::Bytes | BlockKind::String);
    if !is_string(arena.kind(left)?) || !is_string(arena.kind(right)?) {
        return Ok(false);
    }
    Ok(arena.bytes(left)? == arena.bytes(right)?)
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
    #[cfg(not(any(feature = "callable-objects", feature = "class-constructors")))]
    if fields.len() != 2 {
        return Err(Error::DanglingReference);
    }
    #[cfg(any(feature = "callable-objects", feature = "class-constructors"))]
    if fields.len() != object_field_count(arena.kind(object)?) {
        return Err(Error::DanglingReference);
    }
    Value::from_raw(fields[1]).as_ref().ok_or(Error::Type)
}

fn object_ref(arena: &Arena<'_>, object: Value) -> Result<HeapRef, Error> {
    let object = object.as_ref().ok_or(Error::Type)?;
    #[cfg(not(any(feature = "callable-objects", feature = "class-constructors")))]
    if arena.kind(object)? != BlockKind::Object {
        return Err(Error::Type);
    }
    #[cfg(any(feature = "callable-objects", feature = "class-constructors"))]
    if !is_object_kind(arena.kind(object)?) {
        return Err(Error::Type);
    }
    Ok(object)
}

#[cfg(any(feature = "callable-objects", feature = "class-constructors"))]
#[inline]
const fn is_object_kind(kind: BlockKind) -> bool {
    match kind {
        BlockKind::Object => true,
        #[cfg(feature = "callable-objects")]
        BlockKind::CallableObject => true,
        #[cfg(feature = "callable-objects")]
        BlockKind::BoundCallable => true,
        #[cfg(feature = "class-constructors")]
        BlockKind::ClassConstructor => true,
        _ => false,
    }
}

#[cfg(any(feature = "callable-objects", feature = "class-constructors"))]
#[inline]
const fn object_field_count(kind: BlockKind) -> usize {
    match kind {
        BlockKind::Object => 2,
        #[cfg(feature = "callable-objects")]
        BlockKind::CallableObject => 3,
        #[cfg(feature = "callable-objects")]
        BlockKind::BoundCallable => 0,
        #[cfg(feature = "class-constructors")]
        BlockKind::ClassConstructor => 3,
        _ => 0,
    }
}

#[cfg(test)]
mod tests {
    use microesnext_values::strings::atoms::Atoms;

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

    #[test]
    fn deleted_property_slots_are_absent_and_reused() {
        let mut memory = [0; 96];
        let mut arena = Arena::with_root_capacity(&mut memory, 4);
        let mut atoms = Atoms::new(&mut arena).unwrap();
        let first = atoms.intern(&mut arena, b"first").unwrap();
        let second = atoms.intern(&mut arena, b"second").unwrap();
        let object = new_object(&mut arena, Value::NULL).unwrap();
        set(&mut arena, object, first, Value::TRUE).unwrap();
        assert_eq!(delete(&mut arena, object, first), Ok(true));
        assert_eq!(get_own(&arena, object, first), Ok(None));
        set(&mut arena, object, second, Value::FALSE).unwrap();
        assert_eq!(own_property_count(&arena, object), Ok(1));
        assert_eq!(own_property_key(&arena, object, 0), Ok(second));
    }
}
