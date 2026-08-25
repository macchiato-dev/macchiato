#![no_std]

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(i32)]
pub enum ErrorKind {
    Type = 1,
}

/// Allocate a guest error while keeping caller-owned moving values current.
pub fn new(arena: &mut Arena<'_>, kind: ErrorKind, roots: &mut [Value]) -> Result<Value, Error> {
    let kind = Value::from_i30(kind as i32).ok_or(Error::Type)?;
    let error = arena.allocate_values(BlockKind::Error, &mut [kind], roots)?;
    Ok(Value::from_ref(error))
}

pub fn kind(arena: &Arena<'_>, error: Value) -> Result<ErrorKind, Error> {
    let error = error.as_ref().ok_or(Error::Type)?;
    if arena.kind(error)? != BlockKind::Error {
        return Err(Error::Type);
    }
    match arena
        .values(error)?
        .first()
        .copied()
        .map(Value::from_raw)
        .and_then(Value::as_i30)
    {
        Some(value) if value == ErrorKind::Type as i32 => Ok(ErrorKind::Type),
        _ => Err(Error::DanglingReference),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn type_error_survives_compaction() {
        let mut memory = [0; 24];
        let mut arena = Arena::new(&mut memory);
        let error = new(&mut arena, ErrorKind::Type, &mut []).unwrap();
        arena.push(error).unwrap();
        arena.compact(&mut []).unwrap();
        assert_eq!(
            kind(&arena, arena.stack_value(0).unwrap()),
            Ok(ErrorKind::Type)
        );
    }
}
