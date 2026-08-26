use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

const VALUES: u16 = crate::iterators::kind::ARRAY_VALUES;

pub fn new_values(arena: &mut Arena<'_>, array: Value) -> Result<Value, Error> {
    crate::arrays::len(arena, array)?;
    crate::iterators::new(arena, array, VALUES)
}

pub fn next(arena: &mut Arena<'_>, iterator: Value) -> Result<Option<Value>, Error> {
    let (array, index, kind) = crate::iterators::state(arena, iterator)?;
    if kind != VALUES {
        return Err(Error::Type);
    }
    if index >= crate::arrays::len(arena, array)? {
        return Ok(None);
    }
    let value = crate::arrays::get(arena, array, index)?;
    crate::iterators::set_index(arena, iterator, index + 1)?;
    Ok(Some(value))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn yields_holes_as_undefined_and_observes_appends() {
        let mut memory = [0; 96];
        let mut arena = Arena::new(&mut memory);
        let array = crate::arrays::new(&mut arena).unwrap();
        let array = crate::arrays::set(&mut arena, array, 1, Value::TRUE).unwrap();
        let iterator = new_values(&mut arena, array).unwrap();
        assert_eq!(next(&mut arena, iterator), Ok(Some(Value::UNDEFINED)));
        assert_eq!(next(&mut arena, iterator), Ok(Some(Value::TRUE)));
        assert_eq!(
            crate::arrays::push(&mut arena, array, Value::FALSE).unwrap(),
            array
        );
        assert_eq!(next(&mut arena, iterator), Ok(Some(Value::FALSE)));
        assert_eq!(next(&mut arena, iterator), Ok(None));
    }
}
