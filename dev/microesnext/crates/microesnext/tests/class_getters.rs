use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn an_instance_getter_runs_with_its_receiver() {
    let code = compile_script(
        "let Type = class { constructor(value) { this.value = value; } \
         get answer() { return this.value; } }; return new Type(42).answer;",
    )
    .unwrap();
    let mut memory = [0; 1536];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn an_instance_getter_can_return_an_object() {
    let code = compile_script(
        "let Type = class { constructor(value) { this.value = {answer: value}; } \
         get object() { return this.value; } }; return new Type(42).object.answer;",
    )
    .unwrap();
    let mut memory = [0; 1536];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn getters_declared_before_the_constructor_do_not_replace_it() {
    let code = compile_script(
        "let Type = class { get answer() { return this.value; } \
         constructor(value) { this.value = value; } }; return new Type(42).answer;",
    )
    .unwrap();
    let mut memory = [0; 1536];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn a_named_class_keeps_a_late_constructor_and_earlier_getter() {
    let code = compile_script(
        "let Type = class Inner { get answer() { return this.value; } \
         constructor(value) { this.value = value; } }; return new Type(42).answer;",
    )
    .unwrap();
    let mut memory = [0; 1536];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
