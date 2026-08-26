use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn only_the_selected_assignment_branch_mutates_its_target() {
    let code = compile_script(
        "let value = 0; let result = false ? value = 1 : value = 2; \
         return value;",
    )
    .unwrap();
    let mut memory = [0; 96];

    assert_eq!(
        Machine::new(&code, &mut memory).run().unwrap(),
        Outcome::Complete(Value::from_i30(2).unwrap())
    );
}
