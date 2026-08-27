use microesnext::{Machine, Outcome, Value};

fn run(source: &str) -> Outcome {
    let code = microesnext_compiler::compile_script(source).unwrap();
    let mut memory = [0; 384];
    Machine::new(&code, &mut memory).run().unwrap()
}

#[test]
fn do_while_runs_once_and_routes_continue_to_its_condition() {
    assert_eq!(
        run("let count = 0; do { count++; } while (false); return count;"),
        Outcome::Complete(Value::from_i30(1).unwrap())
    );
    assert_eq!(
        run(
            "let count = 0; do { count++; if (count < 3) continue; break; } while (true); return count;"
        ),
        Outcome::Complete(Value::from_i30(3).unwrap())
    );
}
