use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn source_if_else_composes_truthiness_and_locals() {
    for (condition, expected) in [(0, 42), (1, 1)] {
        let source = format!(
            "let condition = {condition}; if (condition) {{ return 1; }} else {{ return 42; }}"
        );
        let code = compile_script(&source).unwrap();
        let mut memory = [0; 96];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run(),
            Ok(Outcome::Complete(Value::from_i30(expected).unwrap()))
        );
    }
}
