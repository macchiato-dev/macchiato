use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 256];
    Machine::new(&code, &mut memory).run().unwrap()
}

#[test]
fn defaults_observe_earlier_parameters_and_only_replace_undefined() {
    let source = "function add(base, amount = base + 2) { return amount; } return add(40);";
    assert_eq!(run(source), Outcome::Complete(Value::from_i30(42).unwrap()));

    let source = "function add(base, amount = base + 2) { return amount; } return add(40, 7);";
    assert_eq!(run(source), Outcome::Complete(Value::from_i30(7).unwrap()));
}
