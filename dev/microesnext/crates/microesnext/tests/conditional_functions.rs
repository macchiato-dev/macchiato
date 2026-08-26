use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn relocates_both_branches_inside_an_appended_function_body() {
    let code = compile_script(
        "let choose = value => value ? 42 : 7; \
         return choose(false);",
    )
    .unwrap();
    let mut memory = [0; 256];

    assert_eq!(
        Machine::new(&code, &mut memory).run().unwrap(),
        Outcome::Complete(Value::from_i30(7).unwrap())
    );
}
