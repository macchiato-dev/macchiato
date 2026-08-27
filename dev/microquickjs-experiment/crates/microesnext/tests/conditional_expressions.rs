use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 64];
    Machine::new(&code, &mut memory).run().unwrap()
}

#[test]
fn selects_exactly_one_conditional_branch() {
    assert_eq!(
        run("return true ? 42 : 7;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
    assert_eq!(
        run("return false ? 42 : 7;"),
        Outcome::Complete(Value::from_i30(7).unwrap())
    );
}

#[test]
fn conditional_expressions_associate_from_the_right() {
    assert_eq!(
        run("return false ? 1 : true ? 2 : 3;"),
        Outcome::Complete(Value::from_i30(2).unwrap())
    );
}
