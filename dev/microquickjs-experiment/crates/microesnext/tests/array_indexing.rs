use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 512];
    Machine::new(&code, &mut memory).run().unwrap()
}

#[test]
fn reads_an_index_computed_by_an_expression() {
    assert_eq!(
        run("return [7, 42][0 + 1];"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn chains_index_reads_through_nested_arrays() {
    assert_eq!(
        run("return [[1], [42]][1][0];"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
