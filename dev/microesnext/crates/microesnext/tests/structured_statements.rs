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
