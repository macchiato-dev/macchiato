use crate::{Arena, BlockKind};
use microesnext_types::{Error, Value};

pub fn is_function(arena: &Arena<'_>, value: Value) -> bool {
    value
        .as_ref()
        .and_then(|reference| arena.kind(reference).ok())
        == Some(BlockKind::Closure)
}

pub fn capture_stack(
    arena: &mut Arena<'_>,
    entry: u32,
    capture_count: usize,
) -> Result<Value, Error> {
    let entry = Value::from_i30(entry as i32).ok_or(Error::BadBytecode)?;
    let closure =
        arena.allocate_from_stack(BlockKind::Closure, &mut [entry], capture_count, &mut [])?;
    Ok(Value::from_ref(closure))
}

pub fn entry(arena: &Arena<'_>, closure: Value) -> Result<usize, Error> {
    let closure = closure.as_ref().ok_or(Error::Type)?;
    if arena.kind(closure)? != BlockKind::Closure {
        return Err(Error::Type);
    }
    arena
        .values(closure)?
        .first()
        .copied()
        .map(Value::from_raw)
        .and_then(Value::as_i30)
        .map(|entry| entry as usize)
        .ok_or(Error::DanglingReference)
}

pub fn capture(arena: &Arena<'_>, closure: Value, index: usize) -> Result<Value, Error> {
    let closure = closure.as_ref().ok_or(Error::Type)?;
    if arena.kind(closure)? != BlockKind::Closure {
        return Err(Error::Type);
    }
    arena
        .values(closure)?
        .get(index + 1)
        .copied()
        .map(Value::from_raw)
        .ok_or(Error::BadBytecode)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn captures_are_stored_in_source_order() {
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        arena.push(Value::from_i30(10).unwrap()).unwrap();
        arena.push(Value::from_i30(20).unwrap()).unwrap();
        let closure = capture_stack(&mut arena, 17, 2).unwrap();
        assert_eq!(entry(&arena, closure).unwrap(), 17);
        assert_eq!(capture(&arena, closure, 0).unwrap().as_i30(), Some(10));
        assert_eq!(capture(&arena, closure, 1).unwrap().as_i30(), Some(20));
    }
}
