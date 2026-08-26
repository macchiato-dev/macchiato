use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn a_method_can_assign_an_index_through_its_receiver() {
    let code = compile_script(
        "class Box { \
           constructor(items) { this.items = items; } \
           set(index, value) { return this.items[index] = value; } \
         } \
         let items = [0]; let box = new Box(items); return box.set(0, 42);",
    )
    .unwrap();
    let mut memory = [0; 2048];
    let mut machine = Machine::with_objects(&code, &mut memory, 24).unwrap();

    assert_eq!(
        machine.run().unwrap(),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
