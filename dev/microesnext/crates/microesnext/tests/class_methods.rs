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
