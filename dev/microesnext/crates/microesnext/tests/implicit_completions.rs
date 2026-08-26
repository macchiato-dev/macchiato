use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 512];
    Machine::new(&code, &mut memory).run().unwrap()
}

#[test]
fn empty_scripts_and_empty_returns_complete_with_undefined() {
    assert_eq!(run(""), Outcome::Complete(Value::UNDEFINED));
    assert_eq!(run("return;"), Outcome::Complete(Value::UNDEFINED));
}

#[cfg(all(feature = "expression-statements", feature = "function-arguments"))]
#[test]
fn statement_only_functions_fall_through_with_undefined() {
    assert_eq!(
        run("let noop = () => { 1; }; return noop();"),
        Outcome::Complete(Value::UNDEFINED)
    );
}

#[cfg(all(
    feature = "exceptions",
    feature = "expression-statements",
    feature = "function-arguments"
))]
#[test]
fn fallthrough_closes_try_handlers_and_discards_pending_catches() {
    assert_eq!(
        run("try { 1; } catch { throw 7; }"),
        Outcome::Complete(Value::UNDEFINED)
    );
    assert_eq!(
        run("try { throw 7; } catch { 1; }"),
        Outcome::Complete(Value::UNDEFINED)
    );
}
