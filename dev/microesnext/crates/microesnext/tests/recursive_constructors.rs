use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 640];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    machine
        .run()
        .unwrap_or_else(|error| panic!("{error:?}; bytecode: {code:?}"))
}

#[test]
fn named_expression_observes_its_constructor_wrapper() {
    let outcome = run(
        "let Constructor = function PrivateName() { return PrivateName; }; \
         return Constructor() === Constructor;",
    );
    assert_eq!(outcome, Outcome::Complete(Value::TRUE));

    let outcome = run(
        "let Constructor = function PrivateName() { return PrivateName; }; \
         return new Constructor() === Constructor;",
    );
    assert_eq!(outcome, Outcome::Complete(Value::TRUE));
}
