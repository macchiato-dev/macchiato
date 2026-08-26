use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn signed_shift_has_javascript_precedence() {
    let code = compile_script("return 40 + 44 >> 1;").unwrap();
    let mut memory = [0; 64];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn signed_left_shift_has_javascript_precedence() {
    let code = compile_script("return 20 + 1 << 1;").unwrap();
    let mut memory = [0; 64];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn bitwise_or_has_javascript_precedence() {
    let code = compile_script("return 40 | 2;").unwrap();
    let mut memory = [0; 64];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
