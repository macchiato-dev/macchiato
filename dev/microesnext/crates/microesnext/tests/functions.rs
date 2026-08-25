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

#[test]
fn source_function_receives_multiple_arguments_in_order() {
    assert_eq!(
        run("function add(left, right) { return left + right; } return add(40, 2);"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn source_function_keeps_parameters_and_lexical_locals_in_one_frame() {
    assert_eq!(
        run("function addBase(value) { let base = 40; return base + value; } return addBase(2);"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn source_function_branches_over_its_own_parameter_frame() {
    assert_eq!(
        run(
            "function choose(condition) { if (condition) { return 42; } else { return 0; } } return choose(true);"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn closure_and_outer_scope_share_a_mutable_binding_cell() {
    assert_eq!(
        run(
            "let count = 40; function increment() { count = count + 1; return count; } let first = increment(); return increment();"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn sibling_closures_and_outer_writes_share_one_binding_cell() {
    assert_eq!(
        run(
            "let count = 40; function increment() { count = count + 1; return count; } function read() { return count; } let ignored = increment(); count = 42; return read();"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn self_reference_resolves_to_the_initialized_closure() {
    let code = compile_script(
        "function selfReference() { return selfReference; } return selfReference();",
    )
    .unwrap();
    let mut memory = [0; 256];
    let mut machine = Machine::new(&code, &mut memory);
    let Outcome::Complete(function) = machine.run().unwrap() else {
        panic!("expected a closure")
    };
    assert!(microesnext::functions::entry(machine.arena(), function).is_ok());
}
