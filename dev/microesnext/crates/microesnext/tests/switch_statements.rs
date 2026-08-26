use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn a_non_fallthrough_switch_selects_an_abrupt_case() {
    let code = compile_script(
        "function pick(value) { switch (value) { \
           case 1: return 40; case 2: return 42; \
         } } return pick(2);",
    )
    .unwrap();
    let mut memory = [0; 512];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
