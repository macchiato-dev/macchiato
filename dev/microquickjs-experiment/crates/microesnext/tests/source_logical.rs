use microesnext::{Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn source_negation_uses_composed_runtime_truthiness() {
    for (source, expected) in [
        ("return !!!false;", Value::TRUE),
        ("return !'';", Value::TRUE),
        ("return !'value';", Value::FALSE),
    ] {
        let code = compile_script(source).unwrap();
        let mut memory = [0; 48];
        let mut machine = microesnext::Machine::with_strings(&code, &mut memory, 0).unwrap();
        assert_eq!(machine.run(), Ok(Outcome::Complete(expected)));
    }
}
