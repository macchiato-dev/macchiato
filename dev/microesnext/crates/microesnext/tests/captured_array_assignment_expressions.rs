use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn a_closure_can_assign_through_captured_mixed_property_and_index_suffixes() {
    let code = compile_script(
        "let items = [0]; let holder = { items: items }; \
         let set = () => { return holder.items[0] = 42; }; \
         let result = set(); return items[0];",
    )
    .unwrap();
    let mut memory = [0; 1536];
    let mut machine = Machine::with_objects(&code, &mut memory, 16).unwrap();

    assert_eq!(
        machine.run().unwrap(),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
