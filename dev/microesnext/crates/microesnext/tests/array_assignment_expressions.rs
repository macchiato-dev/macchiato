use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 768];
    Machine::new(&code, &mut memory).run().unwrap()
}

#[test]
fn a_computed_index_assignment_returns_and_stores_its_value() {
    assert_eq!(
        run(
            "let values = [0, 0]; let index = 1; let result = values[index] = 42; return values[1];"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn a_nested_index_assignment_updates_the_innermost_array() {
    assert_eq!(
        run("let values = [[0]]; return values[0][0] = 42;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
