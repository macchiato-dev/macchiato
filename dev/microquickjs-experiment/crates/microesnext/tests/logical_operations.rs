use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 128];
    Machine::new(&code, &mut memory).run().unwrap()
}

#[test]
fn preserves_the_selected_operand() {
    for (source, expected) in [
        ("return false && 42;", Value::FALSE),
        ("return true && 42;", Value::from_i30(42).unwrap()),
        ("return 7 || 42;", Value::from_i30(7).unwrap()),
        ("return 0 || 42;", Value::from_i30(42).unwrap()),
        ("return false || true && 42;", Value::from_i30(42).unwrap()),
    ] {
        assert_eq!(run(source), Outcome::Complete(expected));
    }
}

#[test]
fn skips_the_unselected_expression() {
    assert_eq!(
        run("let fail = () => { throw 9; }; return false && fail();"),
        Outcome::Complete(Value::FALSE)
    );
    assert_eq!(
        run("let fail = () => { throw 9; }; return true || fail();"),
        Outcome::Complete(Value::TRUE)
    );
}

#[test]
fn relocates_short_circuit_targets_inside_a_function() {
    assert_eq!(
        run("let choose = (left, right) => left || right; return choose(0, 42);"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
