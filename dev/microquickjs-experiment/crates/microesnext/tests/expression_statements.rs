use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn discarded_values_do_not_leak_onto_the_operand_stack() {
    let code = compile_script("1; true; 7; return 42;").unwrap();
    let mut memory = [0; 64];

    assert_eq!(
        Machine::new(&code, &mut memory).run().unwrap(),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[cfg(all(feature = "array-assignment-expressions", feature = "arrays"))]
#[test]
fn array_assignment_results_can_be_discarded() {
    let code = compile_script("let values = [0]; values[0] = 42; return values[0];").unwrap();
    let mut memory = [0; 256];

    assert_eq!(
        Machine::new(&code, &mut memory).run().unwrap(),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[cfg(all(
    feature = "control-flow",
    feature = "function-arguments",
    feature = "locals"
))]
#[test]
fn calls_can_be_discarded_in_functions_branches_and_loops() {
    let code = compile_script(
        "let ping = () => { 1; return 7; }; \
         let running = true; \
         while (running) { ping(); running = false; } \
         if (true) { ping(); return 42; } else { return 0; }",
    )
    .unwrap();
    let mut memory = [0; 512];

    assert_eq!(
        Machine::new(&code, &mut memory).run().unwrap(),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[cfg(all(feature = "exceptions", feature = "function-arguments"))]
#[test]
fn calls_can_be_discarded_in_try_and_catch_blocks() {
    let code = compile_script(
        "let ping = () => { return 1; }; \
         try { ping(); throw 7; } catch (error) { ping(); return error; }",
    )
    .unwrap();
    let mut memory = [0; 512];

    assert_eq!(
        Machine::new(&code, &mut memory).run().unwrap(),
        Outcome::Complete(Value::from_i30(7).unwrap())
    );
}

#[cfg(all(feature = "classes", feature = "construction", feature = "objects"))]
#[test]
fn constructors_discard_expressions_before_implicit_receiver_returns() {
    let code = compile_script(
        "class Box { constructor() { 1; this.value = 42; } } \
         return new Box().value;",
    )
    .unwrap();
    let mut memory = [0; 768];

    assert_eq!(
        Machine::with_objects(&code, &mut memory, 8)
            .unwrap()
            .run()
            .unwrap(),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
