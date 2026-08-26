#![no_std]

#[cfg(feature = "environments")]
pub mod environments;
#[cfg(feature = "locals")]
pub mod locals;
#[cfg(feature = "parameters")]
pub mod parameters;
#[cfg(feature = "receivers")]
pub mod receivers;
#[cfg(feature = "recursive-functions")]
pub mod recursive_functions;

#[cfg(test)]
mod tests {
    use microesnext_arena::Arena;
    use microesnext_types::Value;

    #[cfg(feature = "environments")]
    #[test]
    fn environment_cells_survive_mutation_and_relocation() {
        let mut memory = [0; 24];
        let mut arena = Arena::new(&mut memory);
        let cell = crate::environments::new(&mut arena, Value::UNDEFINED).unwrap();
        arena.push(cell).unwrap();
        crate::environments::set(&mut arena, cell, Value::from_i30(42).unwrap()).unwrap();
        arena.compact(&mut []).unwrap();
        let moved = arena.stack_value(0).unwrap();
        assert_eq!(
            crate::environments::get(&arena, moved).unwrap().as_i30(),
            Some(42)
        );
    }

    #[cfg(feature = "locals")]
    #[test]
    fn local_slots_remain_below_temporary_operands() {
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        crate::locals::init(&mut arena, 0, 1).unwrap();
        arena.push(Value::from_i30(42).unwrap()).unwrap();
        crate::locals::store(&mut arena, 0, 0).unwrap();
        arena.push(Value::TRUE).unwrap();
        assert_eq!(
            crate::locals::load(&arena, 0, 0).unwrap().as_i30(),
            Some(42)
        );
        assert_eq!(arena.pop(), Ok(Value::TRUE));
        crate::locals::leave(&mut arena, 0).unwrap();
    }

    #[cfg(feature = "parameters")]
    #[test]
    fn arguments_become_parameter_slots() {
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        arena.push(Value::TRUE).unwrap();
        arena.push(Value::from_i30(42).unwrap()).unwrap();
        assert_eq!(
            crate::parameters::take_callable(&mut arena, 1),
            Ok(Value::TRUE)
        );
        crate::parameters::init_frame(&mut arena, 0, 2, 1).unwrap();
        assert_eq!(arena.stack_value_from_bottom(1).unwrap().as_i30(), Some(42));
        assert_eq!(arena.stack_value_from_bottom(2), Ok(Value::UNDEFINED));
    }

    #[cfg(feature = "receivers")]
    #[test]
    fn receiver_follows_ordinary_local_slots() {
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        let argument = Value::from_i30(42).unwrap();
        arena.push(argument).unwrap();
        crate::receivers::append(&mut arena, 1, Value::TRUE).unwrap();
        crate::receivers::init_frame(&mut arena, 0, 2, 1).unwrap();
        assert_eq!(crate::locals::load(&arena, 0, 0), Ok(argument));
        assert_eq!(crate::receivers::load(&arena, 0), Ok(Value::TRUE));
        crate::receivers::leave(&mut arena, 0).unwrap();
    }

    #[cfg(feature = "recursive-functions")]
    #[test]
    fn recursive_closure_owns_its_self_cell() {
        let mut memory = [0; 40];
        let mut arena = Arena::new(&mut memory);
        let closure =
            crate::recursive_functions::capture_recursive_stack(&mut arena, 17, 0).unwrap();
        let cell = microesnext_arena::closures::capture(&arena, closure, 0).unwrap();
        assert_eq!(crate::environments::get(&arena, cell), Ok(closure));
    }
}
