use microesnext::{Machine, Outcome, Value, arrays};

#[test]
fn source_array_spread_appends_each_value_in_order() {
    let code =
        microesnext_compiler::compile_script("let middle = [7, 9]; return [1, ...middle, 42];")
            .unwrap();
    let mut memory = [0; 192];
    let mut machine = Machine::new(&code, &mut memory);
    let Outcome::Complete(array) = machine.run().unwrap() else {
        panic!("expected array result")
    };
    assert_eq!(arrays::len(machine.arena(), array).unwrap(), 4);
    assert_eq!(
        arrays::get(machine.arena(), array, 3).unwrap(),
        Value::from_i30(42).unwrap()
    );
}
