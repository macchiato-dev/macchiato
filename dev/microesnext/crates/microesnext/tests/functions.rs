use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 256];
    let mut machine = Machine::new(&code, &mut memory);
    machine.run().unwrap()
}

#[test]
fn source_function_receives_an_argument_in_its_first_local_slot() {
    assert_eq!(
        run("function identity(value) { return value; } return identity(42);"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn source_function_without_parameters_leaves_its_frame() {
    assert_eq!(
        run("function answer() { return 42; } return answer();"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
