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
fn function_declaration_is_initialized_before_execution_reaches_it() {
    assert_eq!(
        run("let value = answer(); function answer() { return 42; } return value;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn hoisted_function_keeps_sequential_loop_bindings_separate() {
    assert_eq!(
        run("let value = read(); function read() { let total = 0; for (let item of [1]) for (let index = 0; index < 1; index++) total = total + item; let seen = 0; for (let item of [1]) for (let index = 0; index < 1; index++) seen = seen + item; return total + seen; } return value;"),
        Outcome::Complete(Value::from_i30(2).unwrap())
    );
}

#[test]
fn anonymous_function_expression_is_immediately_callable() {
    assert_eq!(
        run("return function (value) { return value; }(42);"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn anonymous_function_expression_shares_an_outer_binding() {
    assert_eq!(
        run(
            "let base = 40; let addBase = function (value) { return base + value; }; return addBase(2);"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn named_function_expression_recurses_through_its_private_binding() {
    assert_eq!(
        run(
            "let first = true; function takeFirst() { let previous = first; first = false; return previous; } let recurse = function again() { if (takeFirst()) { return again(); } else { return 42; } }; return recurse();"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn arrow_expression_body_receives_arguments_and_captures() {
    assert_eq!(
        run("let base = 40; let addBase = value => base + value; return addBase(2);"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn arrow_block_body_uses_the_shared_function_frame() {
    assert_eq!(
        run("let add = (left, right) => { return left + right; }; return add(40, 2);"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn arrow_parameters_destructure_object_properties_into_local_bindings() {
    assert_eq!(
        run(
            "let add = ({ left, right: value }) => left + value; return add({ left: 40, right: 2 });"
        ),
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
fn rest_parameters_collect_excess_arguments() {
    assert_eq!(
        run("function pick(first, ...rest) { return rest[1]; } return pick(0, 40, 42);"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn method_rest_parameters_preserve_the_receiver_frame() {
    assert_eq!(
        run(
            "let Box = class { pick(...rest) { this.value = rest[1]; return this.value; } }; return new Box().pick(40, 42);"
        ),
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
    #[cfg(feature = "callable-objects")]
    let function = if microesnext::callable_objects::is_callable_object(machine.arena(), function) {
        microesnext::callable_objects::callable(machine.arena(), function).unwrap()
    } else {
        function
    };
    assert!(microesnext::functions::entry(machine.arena(), function).is_ok());
}

#[test]
fn nested_function_captures_its_parent_parameter() {
    assert_eq!(
        run(
            "function outer(value) { function inner() { return value; } return inner(); } return outer(42);"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn deeply_nested_function_receives_a_forwarded_grandparent_capture() {
    assert_eq!(
        run(
            "function outer(value) { function middle() { function inner() { return value; } return inner(); } return middle(); } return outer(42);"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn recursive_source_calls_use_guest_frames_and_a_self_cell() {
    assert_eq!(
        run(
            "let first = true; function takeFirst() { let previous = first; first = false; return previous; } function recurse() { if (takeFirst()) { return recurse(); } else { return 42; } } return recurse();"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[cfg(feature = "property-assignment")]
#[test]
fn a_function_declaration_can_follow_an_assignment_statement() {
    assert_eq!(
        run("let box = {}; box.answer = 42; function read() { return 42; } return read();"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
