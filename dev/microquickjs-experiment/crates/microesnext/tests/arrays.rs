use microesnext::{Machine, Outcome, Value, arrays};

#[test]
fn source_array_literal_uses_optional_array_storage() {
    let code = microesnext_compiler::compile_script("return [7, 9];").unwrap();
    let mut memory = [0; 96];
    let mut machine = Machine::new(&code, &mut memory);
    let Outcome::Complete(array) = machine.run().unwrap() else {
        panic!("expected array result")
    };
    assert_eq!(arrays::len(machine.arena(), array).unwrap(), 2);
    assert_eq!(
        arrays::get(machine.arena(), array, 1).unwrap(),
        Value::from_i30(9).unwrap()
    );
}
