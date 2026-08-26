use alloc::vec;
use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

extern crate alloc;

fn run_with_memory(source: &str, words: usize) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = vec![0; words];
    Machine::new(&code, &mut memory).run().unwrap()
}

fn run(source: &str) -> Outcome {
    run_with_memory(source, 512)
}

#[test]
fn returning_through_nested_try_regions_closes_every_handler() {
    assert_eq!(
        run("try { \
               try { return 42; } catch { return 1; } \
             } catch { return 2; }"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn a_nested_catch_can_rethrow_to_its_outer_region() {
    assert_eq!(
        run("try { \
               try { throw 1; } catch { throw 2; } \
             } catch (outer) { return outer; }"),
        Outcome::Complete(Value::from_i30(2).unwrap())
    );
}

#[test]
fn an_exception_region_can_be_nested_inside_a_catch() {
    assert_eq!(
        run("try { throw 1; } catch { \
               try { throw 2; } catch (inner) { return inner; } \
             }"),
        Outcome::Complete(Value::from_i30(2).unwrap())
    );
}

#[test]
fn thousands_of_exception_regions_use_guest_handlers_not_native_parser_frames() {
    let depth = 2_048;
    let mut source = alloc::string::String::new();
    for _ in 0..depth {
        source.push_str("try {");
    }
    source.push_str("return 42;");
    for _ in 0..depth {
        source.push_str("} catch { return 0; }");
    }

    assert_eq!(
        run_with_memory(&source, depth * 4 + 64),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
