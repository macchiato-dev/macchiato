use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn source_if_else_composes_truthiness_and_locals() {
    for (condition, expected) in [(0, 42), (1, 1)] {
        let source = format!(
            "let condition = {condition}; if (condition) {{ return 1; }} else {{ return 42; }}"
        );
        let code = compile_script(&source).unwrap();
        let mut memory = [0; 96];
        let mut machine = Machine::new(&code, &mut memory);
        assert_eq!(
            machine.run(),
            Ok(Outcome::Complete(Value::from_i30(expected).unwrap()))
        );
    }
}

#[test]
fn source_if_accepts_single_statements_and_an_optional_else() {
    for (condition, expected) in [(0, 7), (1, 42)] {
        let source = format!("let condition = {condition}; if (condition) return 42; return 7;");
        let code = compile_script(&source).unwrap();
        let mut memory = [0; 96];
        assert_eq!(
            Machine::new(&code, &mut memory).run(),
            Ok(Outcome::Complete(Value::from_i30(expected).unwrap()))
        );
    }

    let code =
        compile_script("if (false) return 1; else if (true) return 42; else return 7;").unwrap();
    let mut memory = [0; 96];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn source_while_updates_stable_local_slots() {
    let code = compile_script(
        "let running = true; let answer = 0; while (running) { answer = 42; running = false; } return answer;",
    )
    .unwrap();
    let mut memory = [0; 128];
    let mut machine = Machine::new(&code, &mut memory);
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn declarations_can_follow_control_flow() {
    let code = compile_script(
        "let first = 1; if (false) return 0; const later = 41; return first + later;",
    )
    .unwrap();
    let mut memory = [0; 192];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn structured_else_if_chains_choose_one_branch() {
    let code = compile_script(
        "let value = 2; if (value == 1) { return 10; } else if (value == 2) { return 42; } else { return 30; }",
    )
    .unwrap();
    let mut memory = [0; 192];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn single_if_can_break_a_for_loop() {
    let code = compile_script(
        "let value = 0; for (let i = 0; i < 10; i++) { if (i == 4) break; else value += 1; } return value;",
    )
    .unwrap();
    let mut memory = [0; 192];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(4).unwrap()))
    );
}

#[test]
fn single_if_can_break_a_nested_while_loop() {
    let code = compile_script(
        "let pos = 0, count = 0; while (pos < 10) { if (count % 2 == 0) break; else pos += 2; } return pos;",
    )
    .unwrap();
    let mut memory = [0; 192];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(0).unwrap()))
    );
}
