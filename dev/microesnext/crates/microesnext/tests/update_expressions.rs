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

#[test]
fn postfix_updates_preserve_array_results_and_entries() {
    assert_eq!(
        run("let values = [40]; let old = values[0]++; return old + values[0] - 39;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn postfix_updates_preserve_property_results_and_entries() {
    assert_eq!(
        run("let box = { value: 40 }; let old = box.value++; return old + box.value - 39;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn local_bitwise_or_assignments_return_and_store_the_result() {
    assert_eq!(
        run("let flags = 7; let value = flags |= true ? 8 : 16; return flags + value;"),
        Outcome::Complete(Value::from_i30(30).unwrap())
    );
}

#[test]
fn a_captured_prefix_update_participates_in_a_larger_expression() {
    assert_eq!(
        run("let read = 0; let next = () => ++read == 1; return next() ? 42 : 0;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
