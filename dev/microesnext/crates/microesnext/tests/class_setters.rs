use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn instance_getters_and_setters_share_a_descriptor() {
    let code = compile_script(
        "let Type = class { constructor(value) { this.value = value; } \
         get answer() { return this.value; } \
         set answer(value) { this.value = value; } }; \
         let instance = new Type(1); instance.answer = 42; return instance.answer;",
    )
    .unwrap();
    let mut memory = [0; 2048];
    let mut machine = Machine::with_objects(&code, &mut memory, 12).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[cfg(feature = "property-assignment-expressions")]
#[test]
fn setter_assignment_expressions_keep_the_assigned_value() {
    let code = compile_script(
        "let Type = class { set answer(value) { this.value = value; } }; \
         let instance = new Type(); return instance.answer = 42;",
    )
    .unwrap();
    let mut memory = [0; 1536];
    let mut machine = Machine::with_objects(&code, &mut memory, 10).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
