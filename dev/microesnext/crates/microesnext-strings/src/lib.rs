#![no_std]

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, HeapRef, RootId, Value};

/// A compact atom table retained in the machine's generation-checked roots.
/// Lookup is linear for now; its representation can become a guest-heap hash
/// table without changing atom values or requiring ordinary objects.
pub struct Atoms {
    table: RootId,
}

impl Atoms {
    pub fn new(arena: &mut Arena<'_>) -> Result<Self, Error> {
        let table = arena.allocate_values(BlockKind::Atoms, &mut [], &mut [])?;
        Ok(Self {
            table: arena.retain(Value::from_ref(table))?,
        })
    }

    pub fn intern(&mut self, arena: &mut Arena<'_>, bytes: &[u8]) -> Result<Value, Error> {
        let table = self.table_ref(arena)?;
        for raw in arena.values(table)?.iter().copied() {
            let atom = Value::from_raw(raw);
            let string = atom.as_ref().ok_or(Error::Type)?;
            if arena.bytes_equal(string, bytes)? {
                return Ok(atom);
            }
        }

        let string = arena.allocate_bytes(BlockKind::String, bytes, &mut [])?;
        let mut extra = [Value::from_ref(string)];
        let table = self.table_ref(arena)?;
        let table = arena.extend_values(table, &mut extra, &mut [])?;
        arena.set_root(self.table, Value::from_ref(table))?;
        Ok(extra[0])
    }

    pub fn release(self, arena: &mut Arena<'_>) -> Result<(), Error> {
        arena.release(self.table).map(|_| ())
    }

    fn table_ref(&self, arena: &Arena<'_>) -> Result<HeapRef, Error> {
        arena.root(self.table)?.as_ref().ok_or(Error::Type)
    }
}

#[cfg(test)]
mod tests {
    use microesnext_arena::Arena;

    use super::Atoms;

    #[test]
    fn interns_equal_bytes_once_and_survives_relocation() {
        let mut memory = [0; 48];
        let mut arena = Arena::with_root_capacity(&mut memory, 2);
        let mut atoms = Atoms::new(&mut arena).unwrap();
        let first = atoms.intern(&mut arena, b"title").unwrap();
        assert_eq!(atoms.intern(&mut arena, b"title").unwrap(), first);
        let first_root = arena.retain(first).unwrap();
        arena.compact(&mut []).unwrap();
        assert_eq!(
            atoms.intern(&mut arena, b"title").unwrap(),
            arena.root(first_root).unwrap()
        );
        arena.release(first_root).unwrap();
        atoms.release(&mut arena).unwrap();
    }
}
