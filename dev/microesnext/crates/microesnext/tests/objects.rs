use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn source_object_uses_interned_properties() {
    let code = compile_script("return { answer: 42 }.answer;").unwrap();
    let mut memory = [0; 128];
    let mut machine = Machine::with_objects(&code, &mut memory, 4).unwrap();
    assert_eq!(
        machine.run().unwrap(),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
