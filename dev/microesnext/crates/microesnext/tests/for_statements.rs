use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 512];
    Machine::new(&code, &mut memory)
        .run()
        .unwrap_or_else(|error| panic!("{error:?}; bytecode: {code:?}"))
}

#[test]
fn classic_for_loop_runs_its_update_after_each_body() {
    assert_eq!(
        run("let sum = 0; for (let i = 0; i < 7; i++) sum = sum + i; return sum;"),
        Outcome::Complete(Value::from_i30(21).unwrap())
    );
}

#[test]
fn for_loop_accepts_multiple_initializer_bindings() {
    assert_eq!(
        run("let sum = 0; for (let i = 0, n = 7; i < n; i++) { sum = sum + i; } return sum;"),
        Outcome::Complete(Value::from_i30(21).unwrap())
    );
}
