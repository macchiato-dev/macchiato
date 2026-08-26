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
fn loops_and_conditionals_share_one_nested_control_worklist() {
    assert_eq!(
        run("let outer = true; let inner = false; \
             while (outer) { \
               if (true) { while (inner) {} } else {} \
               outer = false; \
             } \
             return 42;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn thousands_of_source_loops_do_not_need_native_parser_frames() {
    let depth = 2_048;
    let mut source = String::new();
    for _ in 0..depth {
        source.push_str("while (false) {");
    }
    for _ in 0..depth {
        source.push('}');
    }
    source.push_str("return 42;");

    assert_eq!(
        run(&source),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[cfg(feature = "function-arguments")]
#[test]
fn nested_loop_targets_relocate_with_function_bodies() {
    assert_eq!(
        run("let run = () => { \
               let outer = true; let inner = false; \
               while (outer) { \
                 if (true) { while (inner) {} } else {} \
                 outer = false; \
               } \
               return 42; \
             }; \
             return run();"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
