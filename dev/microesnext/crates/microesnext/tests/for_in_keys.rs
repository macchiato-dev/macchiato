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
fn method_and_receiver_survive_allocating_argument_evaluation() {
    let code = compile_script(
        "let object = { method(value) { return value.answer; } }; function argument() { for (let i = 0; i < 80; i++) { let churn = { values: [i, i + 1] }; } return { answer: 42 }; } return object.method(argument());",
    )
    .unwrap();
    let mut memory = [0_u32; 3000];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(42).unwrap())));
}

#[test]
fn method_call_accepts_a_constructed_argument() {
    let code = compile_script(
        "let nextID = 0; let Provider = class { constructor(a, b, c, value) { this.a = a; this.b = b; this.c = c; this.value = value; this.id = nextID++; } }; let object = { method(provider) { return provider.value; } }; return object.method(new Provider([], object, 0, 42));",
    )
    .unwrap();
    let mut memory = [0_u32; 1400];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(42).unwrap())));
}

#[test]
fn method_and_receiver_survive_spread_array_argument() {
    let code = compile_script(
        "let left = [{ key: 'left' }], right = [{ key: 'right' }]; let object = { method(values) { return values.length; } }; return object.method([...left, ...right]);",
    )
    .unwrap();
    let mut memory = [0_u32; 768];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(2).unwrap())));
}

#[test]
fn outer_method_survives_a_nested_method_call_argument() {
    let code = compile_script(
        "let Provider = class { constructor(value) { this.value = value; } }; let inner = { of(value) { return new Provider(value); } }; let Outer = class { static create(config) { return config.extension.value; } }; return Outer.create({ extension: inner.of(42) });",
    )
    .unwrap();
    let mut memory = [0_u32; 768];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(42).unwrap())));
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

#[test]
fn static_factory_preserves_instance_prototype_methods() {
    let code = compile_script(
        "let Facet = class Inner { static define() { return new Inner(); } of(value) { return value; } }; let keymap = Facet.define(); for (let i = 0; i < 80; i++) { let churn = { value: [i, i + 1] }; } return keymap.of(42);",
    )
    .unwrap();
    let mut memory = [0_u32; 10_000];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(42).unwrap())));
}

#[test]
fn instance_method_constructs_an_anonymous_class_with_arguments() {
    let code = compile_script(
        "let nextID = 0; let Provider = class { constructor(deps, facet, kind, value) { this.deps = deps; this.facet = facet; this.kind = kind; this.value = value; this.id = nextID++; } }; let Facet = class Inner { static define() { return new Inner(); } of(value) { return new Provider([], this, 0, value); } }; let facet = Facet.define(); for (let i = 0; i < 80; i++) { let churn = { values: [i, i + 1, i + 2] }; } let provider = facet.of({ answer: 42 }); return provider.value.answer;",
    )
    .unwrap();
    let mut memory = [0_u32; 3_000];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(42).unwrap())));
}

#[test]
fn class_methods_keep_independent_capture_tables() {
    let code = compile_script(
        "let count = 0; let Provider = class { constructor(value) { this.value = value; } }; let Facet = class Inner { constructor() { this.id = count++; } get reader() { return this; } static define() { return new Inner(); } of(value) { return new Provider(value); } compute() { return count; } }; return Facet.define().of(42).value;",
    )
    .unwrap();
    let mut memory = [0_u32; 2048];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(42).unwrap())));
}

#[test]
fn class_method_captures_a_later_lexical_binding() {
    let code = compile_script(
        "var Facet = class { of(value) { return new Provider(value); } }; var Provider = class { constructor(value) { this.value = value; } }; return new Facet().of(42).value;",
    )
    .unwrap();
    let mut memory = [0_u32; 1024];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(42).unwrap())));
}
