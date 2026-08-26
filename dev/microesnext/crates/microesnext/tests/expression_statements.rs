use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn discarded_values_do_not_leak_onto_the_operand_stack() {
    let code = compile_script("1; true; 7; return 42;").unwrap();
    let mut memory = [0; 64];

    assert_eq!(
        Machine::new(&code, &mut memory).run().unwrap(),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
