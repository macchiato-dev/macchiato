use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn methods_capture_the_private_name_of_a_class_expression() {
    let code = compile_script(
        "let Public = class Private { static self() { return Private; } }; \
         return Public.self() === Public;",
    )
    .unwrap();
    let mut memory = [0; 1280];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();

    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::TRUE)));
}
