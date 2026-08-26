use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 512];
    Machine::new(&code, &mut memory).run().unwrap()
}

#[test]
fn normal_try_fallthrough_skips_its_catch_and_joins_later_statements() {
    assert_eq!(
        run("let answer = 0; \
             try { answer = 42; } catch { answer = 1; } \
             return answer;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn catch_fallthrough_discards_the_reason_and_joins_later_statements() {
    assert_eq!(
        run("let answer = 0; \
             try { throw 1; } catch { answer = 42; } \
             return answer;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn an_abrupt_try_can_still_join_through_a_fallthrough_catch() {
    assert_eq!(
        run("try { return 1; } catch {} return 42;"),
        Outcome::Complete(Value::from_i30(1).unwrap())
    );
}

#[cfg(feature = "function-arguments")]
#[test]
fn catch_and_join_targets_relocate_with_function_bodies() {
    assert_eq!(
        run("let run = () => { \
               let answer = 0; \
               try { answer = 42; } catch { answer = 1; } \
               return answer; \
             }; \
             return run();"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
