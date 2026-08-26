use microesnext_arena::Arena;
use microesnext_strings::atoms::Atoms;
use microesnext_types::{Error, RootId, Value};

/// Cached property identities for `{ value, done }`. Cursor-only builds do not
/// need this object or its object/atom dependencies.
pub struct IteratorResultKeys {
    value: RootId,
    done: RootId,
}

impl IteratorResultKeys {
    pub fn new(arena: &mut Arena<'_>, atoms: &mut Atoms) -> Result<Self, Error> {
        let value = atoms.intern(arena, b"value")?;
        let value = arena.retain(value)?;
        let done_value = match atoms.intern(arena, b"done") {
            Ok(done) => done,
            Err(error) => {
                arena.release(value)?;
                return Err(error);
            }
        };
        let done = match arena.retain(done_value) {
            Ok(done) => done,
            Err(error) => {
                arena.release(value)?;
                return Err(error);
            }
        };
        Ok(Self { value, done })
    }

    /// Create the ordinary object returned by `next`. The prototype is passed
    /// in so this crate does not force a built-in-object or realm capability.
    pub fn create(
        &self,
        arena: &mut Arena<'_>,
        prototype: Value,
        value: Value,
        done: bool,
    ) -> Result<Value, Error> {
        let value_key = arena.root(self.value)?;
        let done_key = arena.root(self.done)?;
        let result = microesnext_objects::new_object(arena, prototype)?;
        let result = microesnext_objects::set(arena, result, value_key, value)?;
        microesnext_objects::set(
            arena,
            result,
            done_key,
            if done { Value::TRUE } else { Value::FALSE },
        )
    }

    /// Convert a source adapter's allocation-free `Option<Value>` into the
    /// standard object shape without coupling this crate to that source.
    pub fn create_next(
        &self,
        arena: &mut Arena<'_>,
        prototype: Value,
        next: Option<Value>,
    ) -> Result<Value, Error> {
        match next {
            Some(value) => self.create(arena, prototype, value, false),
            None => self.create(arena, prototype, Value::UNDEFINED, true),
        }
    }

    pub fn release(self, arena: &mut Arena<'_>) -> Result<(), Error> {
        arena.release(self.value)?;
        arena.release(self.done).map(|_| ())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creates_relocatable_iterator_results_with_cached_keys() {
        let mut memory = [0; 128];
        let mut arena = Arena::with_root_capacity(&mut memory, 4);
        let mut atoms = Atoms::new(&mut arena).unwrap();
        let keys = IteratorResultKeys::new(&mut arena, &mut atoms).unwrap();
        let result = keys
            .create(&mut arena, Value::NULL, Value::from_i30(42).unwrap(), false)
            .unwrap();
        let result = arena.retain(result).unwrap();

        arena.compact(&mut []).unwrap();

        let result = arena.root(result).unwrap();
        let value = atoms.intern(&mut arena, b"value").unwrap();
        let done = atoms.intern(&mut arena, b"done").unwrap();
        assert_eq!(
            microesnext_objects::get(&arena, result, value)
                .unwrap()
                .as_i30(),
            Some(42)
        );
        assert_eq!(
            microesnext_objects::get(&arena, result, done),
            Ok(Value::FALSE)
        );
        assert_eq!(
            microesnext_objects::prototype(&arena, result),
            Ok(Value::NULL)
        );
    }

    #[test]
    fn converts_present_and_exhausted_adapter_steps() {
        let mut memory = [0; 160];
        let mut arena = Arena::with_root_capacity(&mut memory, 3);
        let mut atoms = Atoms::new(&mut arena).unwrap();
        let keys = IteratorResultKeys::new(&mut arena, &mut atoms).unwrap();
        let value_key = atoms.intern(&mut arena, b"value").unwrap();
        let done_key = atoms.intern(&mut arena, b"done").unwrap();

        let present = keys
            .create_next(&mut arena, Value::NULL, Value::from_i30(7))
            .unwrap();
        assert_eq!(
            microesnext_objects::get(&arena, present, value_key)
                .unwrap()
                .as_i30(),
            Some(7)
        );
        assert_eq!(
            microesnext_objects::get(&arena, present, done_key),
            Ok(Value::FALSE)
        );

        let exhausted = keys.create_next(&mut arena, Value::NULL, None).unwrap();
        assert_eq!(
            microesnext_objects::get(&arena, exhausted, value_key),
            Ok(Value::UNDEFINED)
        );
        assert_eq!(
            microesnext_objects::get(&arena, exhausted, done_key),
            Ok(Value::TRUE)
        );
    }
}
