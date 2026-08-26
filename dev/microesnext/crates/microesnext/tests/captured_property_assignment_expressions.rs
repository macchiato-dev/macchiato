use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn a_closure_can_assign_through_a_captured_object_reference() {
    let code = compile_script(
        "let object = {}; let set = () => { return object.value = 42; }; \
         let result = set(); return object.value;",
    )
    .unwrap();
    let mut memory = [0; 1024];
    let mut machine = Machine::with_objects(&code, &mut memory, 12).unwrap();

    assert_eq!(
        machine.run().unwrap(),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
