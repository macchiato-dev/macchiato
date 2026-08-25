use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn an_anonymous_class_expression_keeps_all_decorations_on_one_value() {
    let code = compile_script(
        "let Type = class { \
           constructor(value) { this.value = value; } \
           read() { return this.value; } \
           static identity(value) { return value; } \
         }; \
         let instance = new Type(42); \
         return Type.identity(instance.read());",
    )
    .unwrap();
    let mut memory = [0; 1280];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();

    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn an_empty_class_expression_uses_the_implicit_constructor() {
    let code = compile_script("let Type = class {}; return new Type();").unwrap();
    let mut memory = [0; 768];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();

    let Ok(Outcome::Complete(value)) = machine.run() else {
        panic!("expected an instance")
    };
    assert!(microesnext::objects::is_object(machine.arena(), value));
}

#[test]
fn a_class_expression_itself_evaluates_to_the_class_record() {
    let code = compile_script("return class {};").unwrap();
    let mut memory = [0; 512];
    let mut machine = Machine::with_objects(&code, &mut memory, 4).unwrap();

    let Ok(Outcome::Complete(value)) = machine.run() else {
        panic!("expected a class value")
    };
    assert!(microesnext::class_constructors::is_class_constructor(
        machine.arena(),
        value
    ));
}
