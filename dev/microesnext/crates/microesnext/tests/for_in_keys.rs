use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn for_in_yields_property_names_instead_of_values() {
    let code = compile_script(
        "let object = { opacity: 0.5 }; for (let property in object) { return property === 'opacity'; } return false;",
    )
    .unwrap();
    let mut memory = [0_u32; 512];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::TRUE)));
}

#[test]
fn for_in_key_survives_value_lookup_and_nested_closure_creation() {
    let code = compile_script(
        "function render(spec) { for (let property in spec) { let value = spec[property]; let callback = (letter) => letter; return property === 'opacity' && value > 0 && callback('x') === 'x'; } return false; } return render({ opacity: 0.5 });",
    )
    .unwrap();
    let mut memory = [0_u32; 1024];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::TRUE)));
}

#[test]
fn ordinary_method_keeps_its_receiver_with_multiple_arguments() {
    let code = compile_script(
        "let object = { method: function (first, second) { let local = first + second; return this; } }; return object.method(1, 2) === object;",
    )
    .unwrap();
    let mut memory = [0_u32; 1024];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::TRUE)));
}

#[test]
fn string_accumulation_survives_a_callback_call() {
    let code = compile_script(
        "let output = ''; let callback = value => '-' + value; output += callback('v'); return output === '-v';",
    )
    .unwrap();
    let mut memory = [0_u32; 1024];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::TRUE)));
}

#[test]
fn conditionally_created_closure_does_not_control_captured_parameter_storage() {
    let code = compile_script(
        "function render(value, create) { if (create) { let read = () => value; read(); } return value; } return render(42, false);",
    )
    .unwrap();
    let mut memory = [0_u32; 1024];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(42).unwrap())));
}

#[test]
fn string_addition_formats_boxed_numbers() {
    let code = compile_script("return 'opacity: ' + 0.5 === 'opacity: 0.5';").unwrap();
    let mut memory = [0_u32; 512];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::TRUE)));
}

#[test]
fn computed_property_reads_intern_dynamic_string_keys() {
    let code = compile_script(
        "let scopes = { '&light': 'light-theme' }; let key = '&' + 'light'; return scopes[key] === 'light-theme';",
    )
    .unwrap();
    let mut memory = [0_u32; 768];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::TRUE)));
}

#[test]
fn computed_array_length_accepts_a_dynamic_string_key() {
    let code = compile_script("let key = 'len' + 'gth'; return [1, 2, 3][key];").unwrap();
    let mut memory = [0_u32; 512];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(3).unwrap())));
}

#[test]
fn repeated_closure_creation_does_not_nest_environment_cells() {
    let code = compile_script(
        "function read(value) { for (let i = 0; i < 2; i++) { let callback = () => value; callback(); } return value; } return read(42);",
    )
    .unwrap();
    let mut memory = [0_u32; 1024];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(42).unwrap())));
}
