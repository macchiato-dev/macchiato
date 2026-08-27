use microesnext::{Machine, Outcome, Value, objects, symbols};
use microesnext_arena::Arena;

#[test]
fn symbols_compose_as_distinct_property_keys_without_object_changes() {
    let mut memory = [0; 96];
    let mut arena = Arena::with_root_capacity(&mut memory, 3);
    let first = symbols::new(&mut arena, Value::UNDEFINED).unwrap();
    let second = symbols::new(&mut arena, Value::UNDEFINED).unwrap();
    let object = objects::new_object(&mut arena, Value::NULL).unwrap();
    let object = objects::set(&mut arena, object, first, Value::TRUE).unwrap();
    let object = objects::set(&mut arena, object, second, Value::FALSE).unwrap();
    let object_root = arena.retain(object).unwrap();
    let first_root = arena.retain(first).unwrap();
    let second_root = arena.retain(second).unwrap();

    arena.compact(&mut []).unwrap();

    let object = arena.root(object_root).unwrap();
    let first = arena.root(first_root).unwrap();
    let second = arena.root(second_root).unwrap();
    assert_eq!(objects::get(&arena, object, first), Ok(Value::TRUE));
    assert_eq!(objects::get(&arena, object, second), Ok(Value::FALSE));
}

#[test]
fn instanceof_calls_a_well_known_has_instance_method() {
    let code = microesnext_compiler::compile_script(
        "function Type() {} \
         Type['@@hasInstance'] = function (value) { return value === 42; }; \
         return 42 instanceof Type;",
    )
    .unwrap();
    let mut memory = [0; 2048];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::TRUE)));
}
