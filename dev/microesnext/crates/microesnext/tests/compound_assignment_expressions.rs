use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn additive_compound_assignments_update_and_return_the_local() {
    let code = compile_script(
        "let value = 40; let assigned = value += 4; value -= 2; return assigned + value;",
    )
    .unwrap();
    let mut memory = [0; 192];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(86).unwrap()))
    );
}
