use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 768];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    machine
        .run()
        .unwrap_or_else(|error| panic!("{error:?}; bytecode: {code:?}"))
}

#[test]
fn object_values_can_use_enclosing_bindings_and_nested_literals() {
    assert_eq!(
        run("let answer = 42; return { nested: { value: answer } }.nested.value;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn object_values_can_call_guest_functions() {
    assert_eq!(
        run("function answer() { return 42; } return { value: answer() }.value;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn array_values_can_use_enclosing_bindings() {
    let code = compile_script("let answer = 42; return [answer];").unwrap();
    let mut memory = [0; 512];
    let mut machine = Machine::with_objects(&code, &mut memory, 4).unwrap();
    let Ok(Outcome::Complete(array)) = machine.run() else {
        panic!("expected an array")
    };
    assert_eq!(
        microesnext::arrays::get(machine.arena(), array, 0),
        Ok(Value::from_i30(42).unwrap())
    );
}
