use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 256];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    machine
        .run()
        .unwrap_or_else(|error| panic!("{error:?}; bytecode: {code:?}"))
}

#[test]
fn source_functions_create_an_ordinary_prototype_cycle() {
    assert!(matches!(
        run("return function () { return true; };"),
        Outcome::Complete(_)
    ));
    assert!(matches!(
        run("let Constructor = function () { return true; }; return Constructor.prototype;"),
        Outcome::Complete(_)
    ));
    assert!(matches!(
        run(
            "let Constructor = function () { return true; }; return Constructor.prototype.constructor;"
        ),
        Outcome::Complete(_)
    ));
    let outcome = run("let Constructor = function () { return true; }; \
         return Constructor.prototype.constructor === Constructor;");
    assert_eq!(outcome, Outcome::Complete(Value::TRUE));
}

#[test]
fn construction_uses_a_reassigned_prototype() {
    assert_eq!(
        run("function Item() {} Item.prototype = {answer: 42}; let item = new Item(); return item.answer;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn source_arrows_remain_compact_non_constructor_closures() {
    let code = compile_script("return () => true;").unwrap();
    assert!(!code.contains(&(microesnext::bytecode::Opcode::ToConstructor as u8)));
}
