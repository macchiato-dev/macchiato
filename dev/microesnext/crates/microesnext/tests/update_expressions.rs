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
fn prefix_and_postfix_updates_preserve_their_javascript_results() {
    assert_eq!(
        run("let value = 40; let old = value++; let current = ++value; return old + current;"),
        Outcome::Complete(Value::from_i30(82).unwrap())
    );
}

#[test]
fn decrement_updates_the_local_in_both_forms() {
    assert_eq!(
        run("let value = 44; value--; --value; return value;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
