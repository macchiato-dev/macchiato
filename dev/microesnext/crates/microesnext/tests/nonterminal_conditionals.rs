use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 512];
    Machine::new(&code, &mut memory).run().unwrap()
}

#[test]
fn either_branch_can_join_following_statements() {
    assert_eq!(
        run("let answer = 0; if (true) { answer = 42; } else { answer = 7; } return answer;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
    assert_eq!(
        run("let answer = 0; if (false) { answer = 42; } else { answer = 7; } return answer;"),
        Outcome::Complete(Value::from_i30(7).unwrap())
    );
}

#[test]
fn abrupt_branches_do_not_need_a_join_jump() {
    assert_eq!(
        run("let answer = 0; if (true) { return 42; } else { answer = 7; } return answer;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
    assert_eq!(
        run("let answer = 0; if (false) { return 42; } else { answer = 7; } return answer;"),
        Outcome::Complete(Value::from_i30(7).unwrap())
    );
}

#[cfg(feature = "function-arguments")]
#[test]
fn branch_join_targets_relocate_inside_functions() {
    assert_eq!(
        run("let choose = condition => { \
               let answer = 0; \
               if (condition) { answer = 42; } else { answer = 7; } \
               return answer; \
             }; \
             return choose(true);"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
