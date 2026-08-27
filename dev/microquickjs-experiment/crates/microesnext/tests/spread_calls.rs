use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 1536];
    Machine::with_objects(&code, &mut memory, 12)
        .unwrap()
        .run()
        .unwrap()
}

#[test]
fn calls_a_function_with_array_arguments() {
    assert_eq!(
        run("function second(first, second) { return second; } \
             let values = [1, 42]; return second(...values);"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn calls_a_method_with_array_arguments_and_its_receiver() {
    assert_eq!(
        run(
            "let object = { second(first, second) { return second; } }; \
             let values = [1, 42]; return object.second(...values);"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
