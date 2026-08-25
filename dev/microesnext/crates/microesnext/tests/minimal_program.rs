use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn runs_a_factorial_loop() {
    let code = compile_script(
        "let n = 6; let result = 1; while (n > 1) { result = result * n; n = n - 1; } return result;",
    )
    .unwrap();
    let mut memory = [0; 64];
    let mut machine = Machine::new(&code, &mut memory);

    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(720).unwrap()))
    );
}

#[test]
fn branches_on_integer_relations() {
    let code = compile_script("if (1 < 2) { return 42; } else { return 0; }").unwrap();
    let mut memory = [0; 32];
    let mut machine = Machine::new(&code, &mut memory);

    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
