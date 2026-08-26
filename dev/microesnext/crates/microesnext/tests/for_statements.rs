use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 512];
    Machine::new(&code, &mut memory)
        .run()
        .unwrap_or_else(|error| panic!("{error:?}; bytecode: {code:?}"))
}

#[test]
fn classic_for_loop_runs_its_update_after_each_body() {
    assert_eq!(
        run("let sum = 0; for (let i = 0; i < 7; i++) sum = sum + i; return sum;"),
        Outcome::Complete(Value::from_i30(21).unwrap())
    );
}

#[test]
fn for_loop_accepts_multiple_initializer_bindings() {
    assert_eq!(
        run("let sum = 0; for (let i = 0, n = 7; i < n; i++) { sum = sum + i; } return sum;"),
        Outcome::Complete(Value::from_i30(21).unwrap())
    );
}

#[test]
fn for_loop_accepts_multiple_update_expressions() {
    assert_eq!(
        run(
            "let left = 0; let right = 0; for (; ; left += 1, right += 2) { if (left == 2) break; } return left + right;"
        ),
        Outcome::Complete(Value::from_i30(6).unwrap())
    );
}

#[cfg(feature = "for-of-statements")]
#[test]
fn for_of_visits_each_array_value() {
    assert_eq!(
        run("let sum = 0; for (let value of [20, 22]) { sum += value; } return sum;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[cfg(feature = "for-of-statements")]
#[test]
fn separate_for_of_loops_can_reuse_a_binding_name() {
    assert_eq!(
        run(
            "let sum = 0; for (let value of [10, 11]) sum += value; for (let value of [10, 11]) sum += value; return sum;"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn an_unbraced_for_body_can_be_a_conditional_return() {
    assert_eq!(
        run(
            "let ignored = 0; for (let value of [40, 42]) if (value == 42) return value; return ignored;"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn for_in_visits_each_own_object_key() {
    assert_eq!(
        run("let count = 0; for (let key in { first: 1, second: 2 }) count++; return count;"),
        Outcome::Complete(Value::from_i30(2).unwrap())
    );
}
