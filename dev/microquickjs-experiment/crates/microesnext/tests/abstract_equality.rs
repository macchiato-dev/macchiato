use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 64];
    Machine::new(&code, &mut memory).run().unwrap()
}

#[test]
fn abstract_equality_handles_numbers_and_nullish_values() {
    assert_eq!(run("return 42 == 42;"), Outcome::Complete(Value::TRUE));
    assert_eq!(
        run("return null == undefined;"),
        Outcome::Complete(Value::TRUE)
    );
    assert_eq!(run("return 42 != 7;"), Outcome::Complete(Value::TRUE));
}
