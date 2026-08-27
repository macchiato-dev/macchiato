use microesnext::{Machine, Outcome};
use microesnext_compiler::compile_script;

fn evaluate(source: &str) -> f64 {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 64];
    let mut machine = Machine::new(&code, &mut memory);
    let Outcome::Complete(value) = machine.run().unwrap() else {
        panic!("expected number completion")
    };
    microesnext::numbers::get(machine.arena(), value).unwrap()
}

#[test]
fn source_unary_operators_compose_string_numeric_literals() {
    assert_eq!(evaluate("return +' 42 ';"), 42.0);
    assert_eq!(evaluate("return -'1.25';"), -1.25);
    assert_eq!(evaluate("return +'0x2a';"), 42.0);
    assert!(evaluate("return +'not a number';").is_nan());
}
