#![no_std]

use microesnext_arena::Arena;
use microesnext_types::{Error, Value};

/// Rebind a named expression's private self cell to its constructor wrapper.
///
/// Recursive compact closures reserve capture zero for that cell. This
/// allocation-free composition is emitted only when a constructible named
/// expression needs wrapper identity from inside its own body.
pub fn rebind(arena: &mut Arena<'_>, constructor: Value) -> Result<(), Error> {
    let closure = microesnext_callable_objects::callable(arena, constructor)?;
    let cell = microesnext_arena::closures::capture(arena, closure, 0)?;
    microesnext_environments::set(arena, cell, constructor)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn private_self_cell_observes_the_wrapper() {
        let mut memory = [0; 192];
        let mut arena = Arena::new(&mut memory);
        let closure =
            microesnext_recursive_functions::capture_recursive_stack(&mut arena, 0, 0).unwrap();
        let constructor =
            microesnext_callable_objects::new(&mut arena, closure, Value::NULL).unwrap();

        rebind(&mut arena, constructor).unwrap();
        let closure = microesnext_callable_objects::callable(&arena, constructor).unwrap();
        let cell = microesnext_arena::closures::capture(&arena, closure, 0).unwrap();
        assert_eq!(microesnext_environments::get(&arena, cell), Ok(constructor));
    }
}
