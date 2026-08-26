use alloc::string::String;
use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

extern crate alloc;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 1_024];
    Machine::new(&code, &mut memory).run().unwrap()
}

#[test]
fn control_frames_can_be_nested_inside_an_exception_region() {
    assert_eq!(
        run("try { \
               if (true) { while (false) {} } else { throw 1; } \
             } catch { return 0; } \
             return 42;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn exception_frames_can_be_nested_inside_control_frames() {
    assert_eq!(
        run("if (true) { \
               try { while (false) {} } catch { return 0; } \
             } else { return 1; } \
             return 42;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn braced_conditionals_do_not_require_an_else_branch() {
    assert_eq!(
        run("let answer = 40; if (true) { answer += 2; } return answer;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn a_single_statement_conditional_can_control_a_for_loop() {
    assert_eq!(
        run(
            "let answer = 0; if (true) for (let value of [20, 22]) { answer += value; } return answer;"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn a_braced_conditional_can_contain_a_for_loop_after_a_declaration() {
    assert_eq!(
        run(
            "let answer = 0; if (true) { let values = [20, 22]; for (let value of values) answer += value; } return answer;"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn a_braced_consequent_can_have_a_single_statement_alternate() {
    assert_eq!(
        run("let answer = 0; if (false) { answer = 1; } else answer = 42; return answer;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn sibling_branches_can_reuse_a_local_name() {
    assert_eq!(
        run(
            "let answer = 0; if (true) { let next = 42; answer = next; } else { let next = 1; answer = next; } return answer;"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn nested_unbraced_while_loops_execute_their_single_body() {
    assert_eq!(
        run("let answer = 40; if (true) { while (answer < 42) answer += 1; } return answer;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn labeled_break_exits_its_named_outer_loop() {
    assert_eq!(
        run("done: for (; ; ) { while (true) { break done; } } return 42;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn an_else_if_chain_can_reach_a_braced_consequent() {
    assert_eq!(
        run(
            "let answer = 0; if (false) answer = 1; else if (true) { answer = 42; } else answer = 2; return answer;"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn an_else_if_chain_accepts_an_empty_statement() {
    assert_eq!(
        run("let answer = 42; if (false) answer = 0; else if (true) ; return answer;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn continue_reaches_the_update_of_a_classic_for_loop() {
    assert_eq!(
        run(
            "let answer = 0; for (let i = 0; i < 7; i++) { if (i < 5) continue; answer += i; } return answer + 31;"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn continue_advances_a_for_of_iterator() {
    assert_eq!(
        run(
            "let answer = 0; for (let value of [1, 2, 40]) { if (value < 40) continue; answer += value; } return answer + 2;"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn a_single_consequent_can_have_a_braced_alternate() {
    assert_eq!(
        run(
            "let answer = 0; if (false) answer = 1; else { answer = 40; answer += 2; } return answer;"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn abrupt_control_bodies_reach_an_enclosing_guest_handler() {
    assert_eq!(
        run("try { \
               if (true) { while (true) { throw 42; } } else {} \
             } catch (error) { return error; }"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn thousands_of_mixed_frames_do_not_consume_the_rust_stack() {
    let depth = 2_048;
    let mut source = String::new();
    for level in 0..depth {
        match level % 3 {
            0 => source.push_str("if (true) {"),
            1 => source.push_str("try {"),
            _ => source.push_str("while (false) {"),
        }
    }
    for level in (0..depth).rev() {
        match level % 3 {
            0 => source.push_str("} else {}"),
            1 => source.push_str("} catch {}"),
            _ => source.push('}'),
        }
    }
    source.push_str("return 42;");

    assert_eq!(
        run(&source),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[cfg(feature = "function-arguments")]
#[test]
fn all_structured_targets_relocate_inside_function_bodies() {
    assert_eq!(
        run("let run = () => { \
               try { \
                 if (true) { while (false) {} } else { throw 1; } \
               } catch { return 0; } \
               return 42; \
             }; \
             return run();"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
