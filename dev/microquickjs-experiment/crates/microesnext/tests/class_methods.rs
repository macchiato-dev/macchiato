use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn an_instance_method_observes_its_call_receiver() {
    let code = compile_script(
        "class Counter { \
           constructor(value) { this.value = value; } \
           read() { return this.value; } \
         } \
         let counter = new Counter(42); \
         return counter.read();",
    )
    .unwrap();
    let mut memory = [0; 1024];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();

    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn method_arguments_keep_their_slots_ahead_of_the_receiver() {
    let code = compile_script(
        "class Identity { \
           constructor() {} \
           read(value) { return value; } \
         } \
         let identity = new Identity(); \
         return identity.read(42);",
    )
    .unwrap();
    let mut memory = [0; 1024];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();

    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn methods_do_not_gain_constructor_prototypes() {
    let code = compile_script(
        "class Example { constructor() {} read() { return this; } } \
         let example = new Example(); \
         let method = example.read; \
         return new method();",
    )
    .unwrap();
    let mut memory = [0; 1024];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();

    assert_eq!(machine.run(), Err(microesnext::Error::Type));
}

#[test]
fn a_method_only_class_uses_the_implicit_constructor() {
    let code = compile_script(
        "class Answer { read() { return 42; } } \
         let answer = new Answer(); \
         return answer.read();",
    )
    .unwrap();
    let mut memory = [0; 1024];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();

    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn a_static_method_receives_arguments_without_an_instance() {
    let code = compile_script(
        "class Identity { \
           constructor() {} \
           static self() { return this; } \
           static read(value) { return value; } \
         } \
         return Identity.self().read(42);",
    )
    .unwrap();
    let mut memory = [0; 1024];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();

    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
