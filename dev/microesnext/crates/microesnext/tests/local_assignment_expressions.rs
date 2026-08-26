use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 256];
    Machine::new(&code, &mut memory)
        .run()
        .unwrap_or_else(|error| panic!("{error:?}; bytecode: {code:?}"))
}

#[test]
fn local_assignment_evaluates_to_the_stored_value() {
    assert_eq!(
        run("let value = 1; return value = 42;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn chained_assignment_is_right_associative_and_updates_each_local() {
    assert_eq!(
        run("let left = 0; let right = 0; left = right = 42; return right;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
