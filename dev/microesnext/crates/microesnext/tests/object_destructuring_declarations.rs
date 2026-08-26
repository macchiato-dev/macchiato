use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn shorthand_object_destructuring_initializes_each_binding() {
    let code = compile_script("let source = { value: 42 }; let { value } = source; return value;")
        .unwrap();
    let mut memory = [0; 256];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
