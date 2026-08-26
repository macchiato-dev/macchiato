#![no_std]

use microesnext_arena::Arena;
use microesnext_types::Error;

/// Duplicate the top operand without retaining another root or allocation.
#[inline(always)]
pub fn duplicate_top(arena: &mut Arena<'_>) -> Result<(), Error> {
    let value = arena.stack_value(0)?;
    arena.push(value)
}

/// Discard the top operand without coupling ordinary expressions to exceptions.
#[inline(always)]
pub fn drop_top(arena: &mut Arena<'_>) -> Result<(), Error> {
    arena.pop().map(|_| ())
}

#[cfg(test)]
mod tests {
    use microesnext_types::Value;

    use super::*;

    #[test]
    fn duplicates_only_the_top_operand() {
        let mut memory = [0; 16];
        let mut arena = Arena::new(&mut memory);
        arena.push(Value::TRUE).unwrap();
        arena.push(Value::from_i30(42).unwrap()).unwrap();

        duplicate_top(&mut arena).unwrap();
        assert_eq!(arena.pop().unwrap().as_i30(), Some(42));
        assert_eq!(arena.pop().unwrap().as_i30(), Some(42));
        assert_eq!(arena.pop(), Ok(Value::TRUE));
    }

    #[test]
    fn drops_only_the_top_operand() {
        let mut memory = [0; 16];
        let mut arena = Arena::new(&mut memory);
        arena.push(Value::TRUE).unwrap();
        arena.push(Value::from_i30(42).unwrap()).unwrap();

        drop_top(&mut arena).unwrap();
        assert_eq!(arena.pop(), Ok(Value::TRUE));
    }
}
