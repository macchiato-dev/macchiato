use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 768];
    Machine::with_objects(&code, &mut memory, 8)
        .unwrap()
        .run()
        .unwrap_or_else(|error| panic!("{error:?}; bytecode: {code:?}"))
}

#[test]
fn a_local_property_assignment_returns_and_stores_its_value() {
    assert_eq!(
        run("let object = {}; let result = object.value = 42; return object.value;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn a_nested_property_assignment_returns_and_stores_its_value() {
    assert_eq!(
        run("let inner = {}; let outer = { inner: inner }; return outer.inner.value = 42;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
