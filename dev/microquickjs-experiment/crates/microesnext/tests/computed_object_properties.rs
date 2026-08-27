#![cfg(all(
    feature = "array-assignment-expressions",
    feature = "literal-expressions",
    feature = "objects"
))]

use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn computed_object_properties_use_object_keys_not_array_offsets() {
    let code =
        compile_script("var object = {}, key = 'answer'; object[key] = 42; return object[key];")
            .unwrap();
    let mut memory = [0; 256];
    let mut machine = Machine::new(&code, &mut memory);

    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
