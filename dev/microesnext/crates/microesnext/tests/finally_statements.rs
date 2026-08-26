use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 2048];
    Machine::with_objects(&code, &mut memory, 16)
        .unwrap()
        .run()
        .unwrap()
}

#[test]
fn finally_runs_before_a_return_and_preserves_its_value() {
    assert_eq!(
        run("function answer() { try { return 42; } finally {} } return answer();"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
    assert_eq!(
        run("let state = { value: 0 }; function answer() { \
             try { return 1; } finally { state.value = 42; } \
             } answer(); return state.value;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn finally_runs_on_fallthrough_and_exceptional_completion() {
    assert_eq!(
        run(
            "let state = { value: 0 }; try {} finally { state.value = 42; } \
             return state.value;"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
    assert_eq!(
        run("let state = { value: 0 }; try { \
               try { throw 1; } finally { state.value = 42; } \
             } catch {} return state.value;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
