use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn an_instance_getter_runs_with_its_receiver() {
    let code = compile_script(
        "let Type = class { constructor(value) { this.value = value; } \
         get answer() { return this.value; } }; return new Type(42).answer;",
    )
    .unwrap();
    let mut memory = [0; 1536];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
