use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn array_destructuring_declarations_initialize_each_binding() {
    let code = compile_script("let [left, right] = [20, 22]; return left + right;").unwrap();
    let mut memory = [0; 256];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn array_destructuring_declarations_skip_elisions() {
    let code = compile_script("let [, answer,] = [0, 42, 7]; return answer;").unwrap();
    let mut memory = [0; 256];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
