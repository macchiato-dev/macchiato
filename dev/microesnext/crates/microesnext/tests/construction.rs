use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 768];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    machine
        .run()
        .unwrap_or_else(|error| panic!("{error:?}; bytecode: {code:?}"))
}

#[test]
fn new_exposes_the_receiver_and_preserves_it_for_primitive_returns() {
    let outcome = run("let Constructor = function () { return this; }; \
         let value = new Constructor(); \
         return value instanceof Constructor;");
    assert_eq!(outcome, Outcome::Complete(Value::TRUE));

    let outcome = run("let Constructor = function () { return 42; }; \
         let value = new Constructor(); \
         return value instanceof Constructor;");
    assert_eq!(outcome, Outcome::Complete(Value::TRUE));
}

#[test]
fn new_uses_an_explicit_object_return() {
    let outcome = run("let replacement = {}; \
         let Constructor = function () { return replacement; }; \
         return new Constructor() === replacement;");
    assert_eq!(outcome, Outcome::Complete(Value::TRUE));
}

#[test]
fn new_without_parentheses_uses_the_zero_argument_path() {
    let outcome = run("let Constructor = function () { return this; }; \
         return new Constructor instanceof Constructor;");
    assert_eq!(outcome, Outcome::Complete(Value::TRUE));
}

#[test]
fn constructor_arguments_can_initialize_receiver_properties() {
    let outcome = run(
        "let Constructor = function (value) { this.answer = value; return 0; }; \
         let instance = new Constructor(42); \
         return instance.answer;",
    );
    assert_eq!(outcome, Outcome::Complete(Value::from_i30(42).unwrap()));
}

#[test]
fn a_property_can_be_read_directly_from_a_constructed_value() {
    let outcome = run(
        "let Constructor = function (value) { this.answer = value; return 0; }; \
         return new Constructor(42).answer;",
    );
    assert_eq!(outcome, Outcome::Complete(Value::from_i30(42).unwrap()));
}
