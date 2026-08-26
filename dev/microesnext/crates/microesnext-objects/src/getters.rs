use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};

pub fn new(arena: &mut Arena<'_>, callable: Value) -> Result<Value, Error> {
    if !microesnext_arena::closures::is_function(arena, callable) {
        return Err(Error::Type);
    }
    let getter = arena.allocate_values(BlockKind::Getter, &mut [callable], &mut [])?;
    Ok(Value::from_ref(getter))
}

pub fn callable(arena: &Arena<'_>, value: Value) -> Result<Option<Value>, Error> {
    let Some(reference) = value.as_ref() else {
        return Ok(None);
    };
    if arena.kind(reference)? != BlockKind::Getter {
        return Ok(None);
    }
    arena
        .values(reference)?
        .first()
        .copied()
        .map(Value::from_raw)
        .map(Some)
        .ok_or(Error::DanglingReference)
}
