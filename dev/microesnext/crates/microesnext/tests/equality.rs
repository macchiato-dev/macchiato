use microesnext::{Machine, Outcome, Value, bytecode::Opcode};
use microesnext_compiler::{Builder, compile_script};

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    run_code(&code)
}

fn run_code(code: &[u8]) -> Outcome {
    let mut memory = [0; 128];
    Machine::new(code, &mut memory).run().unwrap()
}

#[test]
fn compares_separately_allocated_strings() {
    assert_eq!(
        run_code(
            &Builder::new()
                .string(b"same")
                .string(b"same")
                .op(Opcode::StrictEqual)
                .op(Opcode::Return)
                .finish(),
        ),
        Outcome::Complete(Value::TRUE)
    );
}

#[test]
fn compares_boxed_numbers() {
    assert_eq!(run("return 1.25 === 1.25;"), Outcome::Complete(Value::TRUE));
}

#[test]
fn compares_object_identity() {
    assert_eq!(
        run("let object = {}; return object === object;"),
        Outcome::Complete(Value::TRUE)
    );
    assert_eq!(run("return {} !== {};"), Outcome::Complete(Value::TRUE));
}
