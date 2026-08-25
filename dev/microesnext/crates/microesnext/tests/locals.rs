use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn source_locals_execute_in_the_minimal_machine() {
    let code = compile_script("let answer = 42; return answer;").unwrap();
    let mut memory = [0; 64];
    let mut machine = Machine::new(&code, &mut memory);
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
