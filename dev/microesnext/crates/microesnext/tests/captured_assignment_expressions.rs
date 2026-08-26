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
fn an_outer_capture_assignment_returns_and_stores_its_value() {
    assert_eq!(
        run("let value = 1; let set = () => { return value = 42; }; return set();"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn an_assignment_to_a_locally_held_cell_is_visible_to_a_closure() {
    assert_eq!(
        run("let value = 1; let read = () => value; \
             let assigned = value = 42; return read();"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn captured_and_plain_local_assignment_targets_compose_in_one_chain() {
    assert_eq!(
        run(
            "let captured = 0; let read = () => captured; let local = 0; \
             local = captured = 42; return read();"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn captured_postfix_updates_return_the_old_value_and_store_the_new_one() {
    assert_eq!(
        run("let value = 40; let update = () => value++; return update() + update() - 39;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
