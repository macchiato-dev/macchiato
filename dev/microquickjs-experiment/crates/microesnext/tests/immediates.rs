use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn source_immediates_execute_in_the_minimal_machine() {
    for (source, expected) in [
        ("return undefined;", Value::UNDEFINED),
        ("return null;", Value::NULL),
        ("return false;", Value::FALSE),
        ("return true;", Value::TRUE),
    ] {
        let code = compile_script(source).unwrap();
        let mut memory = [0; 8];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(machine.run(), Ok(Outcome::Complete(expected)));
    }
}
