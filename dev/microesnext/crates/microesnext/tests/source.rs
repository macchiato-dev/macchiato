use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn source_compiles_suspends_and_resumes() {
    let code = compile_script("return 40 + await 2;").unwrap();
    let mut memory = [0; 64];
    let mut machine = Machine::with_root_capacity(&code, &mut memory, 2);
    let Outcome::Await {
        value,
        continuation,
    } = machine.run().unwrap()
    else {
        panic!("expected suspension")
    };
    assert_eq!(value.as_i30(), Some(2));
    assert_eq!(
        machine
            .resume(continuation, Value::from_i30(2).unwrap())
            .unwrap(),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}
