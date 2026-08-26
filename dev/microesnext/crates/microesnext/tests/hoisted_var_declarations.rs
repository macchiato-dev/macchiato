use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn a_function_can_capture_a_later_var_declaration() {
    let code =
        compile_script("function read() { return later; } var later = 42; return read();").unwrap();
    let mut memory = [0; 512];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
