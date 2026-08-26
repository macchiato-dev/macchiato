use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn array_destructuring_reassigns_existing_locals() {
    let code =
        compile_script("let left = 0, right = 0; [left, right] = [40, 2]; return left + right;")
            .unwrap();
    let mut memory = [0; 256];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
