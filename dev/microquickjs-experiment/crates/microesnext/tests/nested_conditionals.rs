use alloc::string::String;
use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

extern crate alloc;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 512];
    Machine::new(&code, &mut memory).run().unwrap()
}

#[test]
fn nested_fallthrough_branches_join_their_parent() {
    assert_eq!(
        run("let answer = 0; \
             if (true) { \
               if (false) { answer = 1; } else { answer = 42; } \
             } else { answer = 7; } \
             return answer;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn thousands_of_source_branches_do_not_need_native_parser_frames() {
    let depth = 2_048;
    let mut source = String::new();
    for _ in 0..depth {
        source.push_str("if (true) {");
    }
    source.push_str("return 42;");
    for _ in 0..depth {
        source.push_str("} else { return 0; }");
    }

    assert_eq!(
        run(&source),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[cfg(feature = "function-arguments")]
#[test]
fn nested_join_targets_relocate_with_function_bodies() {
    assert_eq!(
        run("let choose = value => { \
               let answer = 0; \
               if (value) { \
                 if (false) { answer = 1; } else { answer = 42; } \
               } else { answer = 7; } \
               return answer; \
             }; \
             return choose(true);"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
