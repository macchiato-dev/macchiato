use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};

/// Creates an accessor descriptor with a getter and no setter.
pub fn new(arena: &mut Arena<'_>, callable: Value) -> Result<Value, Error> {
    if !microesnext_arena::closures::is_function(arena, callable) {
        return Err(Error::Type);
    }
    let getter = arena.allocate_values(
        BlockKind::Getter,
        &mut [callable, Value::UNDEFINED],
        &mut [],
    )?;
    Ok(Value::from_ref(getter))
}

pub fn callable(arena: &Arena<'_>, value: Value) -> Result<Option<Value>, Error> {
    let Some(reference) = value.as_ref() else {
        return Ok(None);
    };
    if arena.kind(reference)? != BlockKind::Getter {
        return Ok(None);
    }
    let value = arena
        .values(reference)?
        .first()
        .copied()
        .map(Value::from_raw)
        .ok_or(Error::DanglingReference)?;
    Ok((value != Value::UNDEFINED).then_some(value))
}

/// Creates an accessor descriptor with a setter and no getter.
pub fn new_setter(arena: &mut Arena<'_>, callable: Value) -> Result<Value, Error> {
    if !microesnext_arena::closures::is_function(arena, callable) {
        return Err(Error::Type);
    }
    let setter = arena.allocate_values(
        BlockKind::Getter,
        &mut [Value::UNDEFINED, callable],
        &mut [],
    )?;
    Ok(Value::from_ref(setter))
}

pub fn setter_callable(arena: &Arena<'_>, value: Value) -> Result<Option<Value>, Error> {
    let Some(reference) = value.as_ref() else {
        return Ok(None);
    };
    if arena.kind(reference)? != BlockKind::Getter {
        return Ok(None);
    }
    arena
        .values(reference)?
        .get(1)
        .copied()
        .map(Value::from_raw)
        .ok_or(Error::DanglingReference)
        .and_then(|value| Ok((value != Value::UNDEFINED).then_some(value)))
}

/// Combines two partial descriptors when a class declares both accessors.
pub fn merge(arena: &mut Arena<'_>, old: Value, new: Value) -> Result<Option<Value>, Error> {
    let (Some(old_ref), Some(new_ref)) = (old.as_ref(), new.as_ref()) else {
        return Ok(None);
    };
    if arena.kind(old_ref)? != BlockKind::Getter || arena.kind(new_ref)? != BlockKind::Getter {
        return Ok(None);
    }
    let old_values = arena.values(old_ref)?;
    let new_values = arena.values(new_ref)?;
    if old_values.len() != 2 || new_values.len() != 2 {
        return Err(Error::DanglingReference);
    }
    let old_getter = Value::from_raw(old_values[0]);
    let old_setter = Value::from_raw(old_values[1]);
    let new_getter = Value::from_raw(new_values[0]);
    let new_setter = Value::from_raw(new_values[1]);
    let getter = if new_getter == Value::UNDEFINED {
        old_getter
    } else {
        new_getter
    };
    let setter = if new_setter == Value::UNDEFINED {
        old_setter
    } else {
        new_setter
    };
    let descriptor = arena.allocate_values(BlockKind::Getter, &mut [getter, setter], &mut [])?;
    Ok(Some(Value::from_ref(descriptor)))
}
