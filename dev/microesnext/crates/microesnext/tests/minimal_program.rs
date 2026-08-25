use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::{CompileOptions, NumberMode, compile_script_with_options};

fn compile_script(source: &str) -> Result<Vec<u8>, microesnext_compiler::CompileError> {
    compile_script_with_options(
        source,
        CompileOptions {
            numbers: NumberMode::BoundedI30,
        },
    )
}

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
