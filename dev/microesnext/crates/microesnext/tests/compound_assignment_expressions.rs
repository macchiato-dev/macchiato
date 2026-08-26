use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn additive_compound_assignments_update_and_return_the_local() {
    let code = compile_script(
        "let value = 40; let assigned = value += 4; value -= 2; return assigned + value;",
    )
    .unwrap();
    let mut memory = [0; 192];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(86).unwrap()))
    );
}

#[test]
fn additive_compound_assignments_update_object_properties() {
    let code =
        compile_script("let box = {}; box.count = 40; box.count += 2; return box.count;").unwrap();
    let mut memory = [0; 256];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn property_compound_assignment_expressions_return_the_updated_value() {
    let code = compile_script(
        "let box = {}; let assigned; box.count = 40; assigned = box.count += 2; return assigned;",
    )
    .unwrap();
    let mut memory = [0; 256];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn additive_compound_assignments_update_receiver_properties() {
    let code = compile_script(
        "let Counter = class { constructor() { this.count = 40; } add(value) { this.count += value; return this.count; } }; let counter = new Counter(); return counter.add(2);",
    )
    .unwrap();
    let mut memory = [0; 768];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn additive_compound_assignments_update_captured_bindings() {
    let code = compile_script(
        "let value = 40; function add(amount) { value += amount; return value; } return add(2);",
    )
    .unwrap();
    let mut memory = [0; 512];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
