use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

const VALUES: u16 = microesnext_iterators::kind::ARRAY_VALUES;

pub fn new_values(arena: &mut Arena<'_>, array: Value) -> Result<Value, Error> {
    crate::len(arena, array)?;
    microesnext_iterators::new(arena, array, VALUES)
}

pub fn next(arena: &mut Arena<'_>, iterator: Value) -> Result<Option<Value>, Error> {
    let (array, index, kind) = microesnext_iterators::state(arena, iterator)?;
    if kind != VALUES {
        return Err(Error::Type);
    }
    if index >= crate::len(arena, array)? {
        return Ok(None);
    }
    let value = crate::get(arena, array, index)?;
    microesnext_iterators::set_index(arena, iterator, index + 1)?;
    Ok(Some(value))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn yields_holes_as_undefined_and_observes_appends() {
        let mut memory = [0; 96];
        let mut arena = Arena::new(&mut memory);
        let array = crate::new(&mut arena).unwrap();
        let array = crate::set(&mut arena, array, 1, Value::TRUE).unwrap();
        let iterator = new_values(&mut arena, array).unwrap();
        assert_eq!(next(&mut arena, iterator), Ok(Some(Value::UNDEFINED)));
        assert_eq!(next(&mut arena, iterator), Ok(Some(Value::TRUE)));
        assert_eq!(crate::push(&mut arena, array, Value::FALSE).unwrap(), array);
        assert_eq!(next(&mut arena, iterator), Ok(Some(Value::FALSE)));
        assert_eq!(next(&mut arena, iterator), Ok(None));
    }
}
