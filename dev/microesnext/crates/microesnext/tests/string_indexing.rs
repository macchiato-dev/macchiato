use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 512];
    Machine::new(&code, &mut memory).run().unwrap()
}

#[test]
fn unicode_string_length_matches_indexing_units() {
    assert_eq!(
        run("return '\u{b7}\u{b7}\u{b7}'.length;"),
        Outcome::Complete(Value::from_i30(3).unwrap())
    );
}

#[test]
fn astral_string_length_uses_utf16_units() {
    assert_eq!(
        run("return '\u{1d465}'.length;"),
        Outcome::Complete(Value::from_i30(2).unwrap())
    );
}
