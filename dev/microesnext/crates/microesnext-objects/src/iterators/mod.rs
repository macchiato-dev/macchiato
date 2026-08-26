#[cfg(feature = "iterator-protocol")]
pub mod protocol;
#[cfg(feature = "iterator-results")]
pub mod results;

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, HeapRef, Value};

const INDEX: usize = 1;

/// Shared adapter tags prevent a cursor from being consumed by another
/// adapter for the same source type. Adding a source does not add code here.
pub mod kind {
    pub const ARRAY_VALUES: u16 = 0;
    pub const COLLECTION_KEYS: u16 = 1;
    pub const COLLECTION_VALUES: u16 = 2;
    pub const COLLECTION_ENTRIES: u16 = 3;
}

pub fn new(arena: &mut Arena<'_>, source: Value, kind: u16) -> Result<Value, Error> {
    let iterator = arena.allocate_values(
        BlockKind::Iterator,
        &mut [
            source,
            Value::from_i30(0).unwrap(),
            Value::from_i30(kind as i32).unwrap(),
        ],
        &mut [],
    )?;
    Ok(Value::from_ref(iterator))
}

pub fn state(arena: &Arena<'_>, iterator: Value) -> Result<(Value, usize, u16), Error> {
    let iterator = iterator_ref(arena, iterator)?;
    let [source, index, kind] = arena.values(iterator)? else {
        return Err(Error::DanglingReference);
    };
    let index = Value::from_raw(*index)
        .as_i30()
        .and_then(|index| usize::try_from(index).ok())
        .ok_or(Error::DanglingReference)?;
    let kind = Value::from_raw(*kind)
        .as_i30()
        .and_then(|kind| u16::try_from(kind).ok())
        .ok_or(Error::DanglingReference)?;
    Ok((Value::from_raw(*source), index, kind))
}

pub fn set_index(arena: &mut Arena<'_>, iterator: Value, index: usize) -> Result<(), Error> {
    let iterator = iterator_ref(arena, iterator)?;
    let index = i32::try_from(index)
        .ok()
        .and_then(Value::from_i30)
        .ok_or(Error::OutOfMemory)?;
    arena.set_value(iterator, INDEX, index)
}

fn iterator_ref(arena: &Arena<'_>, iterator: Value) -> Result<HeapRef, Error> {
    let iterator = iterator.as_ref().ok_or(Error::Type)?;
    if arena.kind(iterator)? != BlockKind::Iterator || arena.values(iterator)?.len() != 3 {
        return Err(Error::Type);
    }
    Ok(iterator)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cursor_retains_its_source_and_position_through_relocation() {
        let mut memory = [0; 40];
        let mut arena = Arena::with_root_capacity(&mut memory, 1);
        let source = arena
            .allocate_values(BlockKind::Values, &mut [Value::TRUE], &mut [])
            .map(Value::from_ref)
            .unwrap();
        let iterator = new(&mut arena, source, 9).unwrap();
        set_index(&mut arena, iterator, 7).unwrap();
        let root = arena.retain(iterator).unwrap();
        arena.compact(&mut []).unwrap();
        let iterator = arena.root(root).unwrap();
        let (source, index, kind) = state(&arena, iterator).unwrap();
        assert_eq!(index, 7);
        assert_eq!(kind, 9);
        assert_eq!(
            arena.values(source.as_ref().unwrap()).unwrap(),
            [Value::TRUE.raw()]
        );
    }
}
