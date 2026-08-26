use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn a_derived_class_inherits_instance_methods() {
    let code = compile_script(
        "let Base = class { answer() { return 42; } }; \
         let Derived = class extends Base {}; return new Derived().answer();",
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
fn a_derived_constructor_calls_super_with_the_same_receiver() {
    let code = compile_script(
        "let Base = class { constructor(value) { this.value = value; } \
         read() { return this.value; } }; \
         let Derived = class extends Base { constructor(value) { super(value); } }; \
         return new Derived(42).read();",
    )
    .unwrap();
    let mut memory = [0; 2048];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
