use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn void_discards_its_operand_and_returns_undefined() {
    let code = compile_script("return void 42;").unwrap();
    let mut memory = [0; 64];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::UNDEFINED))
    );
}
