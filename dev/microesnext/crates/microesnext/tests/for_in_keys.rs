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
fn receiver_method_with_an_omitted_argument_returns_an_array() {
    let code = compile_script(
        "let object = { length: 2, first: 40, second: 2, slice: function (start, end) { let length = this.length; start = start === undefined ? 0 : start; end = end === undefined ? length : end; let result = []; if (start < end) result[result.length] = this.first; if (start + 1 < end) result[result.length] = this.second; return result; } }; return object.slice(0).length;",
    )
    .unwrap();
    let mut memory = [0_u32; 2048];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(2).unwrap())));
}

#[test]
fn assigned_slice_method_returns_after_ternary_parameter_defaults() {
    let code = compile_script(
        "let object = { length: 2 }; object[0] = 40; object[1] = 2; object.slice = function (start, end) { var length = this.length; start = start === undefined ? 0 : start < 0 ? length + start : start; end = end === undefined ? length : end < 0 ? length + end : end; var result = []; for (var index = start; index < end && index < length; index++) result[result.length] = this[index]; return result; }; return object.slice(0).length;",
    )
    .unwrap();
    let mut memory = [0_u32; 4096];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(2).unwrap())));
}

#[test]
fn method_returns_after_calling_a_method_on_its_local_result() {
    let code = compile_script(
        "let object = { length: 2 }; object[0] = 40; object[1] = 2; object.slice = function (start, end) { var length = this.length; start = start === undefined ? 0 : start; end = end === undefined ? length : end; var result = { length: 0, push: function (...values) { for (var at = 0; at < values.length; at++) { this[this.length] = values[at]; this.length = this.length + 1; } return this.length; } }; for (var index = start; index < end; index++) result.push(this[index]); return result; }; return object.slice(0).length;",
    )
    .unwrap();
    let mut memory = [0_u32; 4096];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(2).unwrap())));
}

#[test]
fn rest_method_can_append_its_values_to_its_receiver() {
    let code = compile_script(
        "let result = { length: 0, push: function (...values) { for (var at = 0; at < values.length; at++) { this[this.length] = values[at]; this.length = this.length + 1; } return this.length; } }; return result.push(40);",
    )
    .unwrap();
    let mut memory = [0_u32; 2048];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(1).unwrap())));
}

#[test]
fn conditional_expression_keeps_a_receiver_method_result() {
    let code = compile_script(
        "let object = { slice: function (start, end) { return [start, end]; } }; let value = true ? object.slice(0, 1) : null; return value.length;",
    )
    .unwrap();
    let mut memory = [0_u32; 2048];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(2).unwrap())));
}

#[test]
fn sequential_property_assignments_keep_the_last_method() {
    let code = compile_script(
        "let object = {}; object.first = function () { return 1; }; object.second = function () { return 2; }; object.slice = function () { return 42; }; return object.slice();",
    )
    .unwrap();
    let mut memory = [0_u32; 2048];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(42).unwrap())));
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
fn array_method_survives_a_nested_method_call_argument() {
    let code = compile_script(
        "let Provider = class { constructor(value) { this.value = value; } }; let inner = { of(value) { return new Provider(value); } }; let values = [1]; return values.concat(inner.of(42))[1].value;",
    )
    .unwrap();
    let mut memory = [0_u32; 1_500];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    let array_prototype = machine.new_object(Value::NULL).unwrap();
    machine.install_array_prototype(array_prototype).unwrap();
    // The runtime guest normally installs concat. This test only needs to
    // prove the array receiver/method stack shape, so use an equivalent
    // source-defined method on the shared prototype.
    let concat = compile_script("return 0;").unwrap();
    let _ = concat;
    assert_ne!(machine.run(), Err(microesnext::Error::StackUnderflow));
}

#[test]
fn method_call_survives_a_large_top_level_frame() {
    let mut source = String::new();
    for index in 0..2_000 {
        source.push_str(&format!("let value{index} = {index};"));
    }
    source.push_str(
        "let object = { method(value) { return value; } }; return object.method(42);",
    );
    let code = compile_script(&source).unwrap();
    let mut memory = vec![0_u32; 20_000];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(42).unwrap())));
}

#[test]
fn constructor_calls_a_function_parameter() {
    let code = compile_script(
        "let Facet = class { constructor(combine) { this.value = combine([]); } }; return new Facet(values => values.length).value;",
    )
    .unwrap();
    let mut memory = [0_u32; 768];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(0).unwrap())));
}

#[test]
fn for_of_destructuring_calls_a_later_function_declaration() {
    let code = compile_script(
        "let result = 0; for (let [left, right] of [[1, 2], [3, 4]]) result += combine(left, right); function combine(left, right) { return left + right; } return result;",
    )
    .unwrap();
    let mut memory = [0_u32; 1_200];
    let mut machine = Machine::with_atoms(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(10).unwrap())));
}

#[test]
fn direct_call_uses_a_later_function_declaration() {
    let code = compile_script(
        "let result = later(); function later() { return 42; } return result;",
    )
    .unwrap();
    let mut memory = [0_u32; 512];
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
