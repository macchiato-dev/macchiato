use microesnext::{Machine, Outcome};
use microesnext_compiler::compile_script;

#[test]
fn source_fractional_addition_uses_optional_numbers() {
    let code = compile_script("return 1.25 + 2;").unwrap();
    let mut memory = [0; 48];
    let mut machine = Machine::new(&code, &mut memory);
    let Outcome::Complete(value) = machine.run().unwrap() else {
        panic!("expected number completion")
    };
    assert_eq!(microesnext::numbers::get(machine.arena(), value), Ok(3.25));
}
