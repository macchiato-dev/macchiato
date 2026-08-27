use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn shorthand_object_destructuring_initializes_each_binding() {
    let code = compile_script("let source = { value: 42 }; let { value } = source; return value;")
        .unwrap();
    let mut memory = [0; 256];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn object_destructuring_supports_aliases_and_defaults() {
    let code = compile_script(
        "let source = { from: 42 }; let { from, to = from, insert: inserted = 0 } = source; return from + to + inserted - 42;",
    )
    .unwrap();
    let mut memory = [0; 512];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn object_destructuring_can_precede_another_declarator() {
    let code = compile_script(
        "let source = { value: 40 }; let { value } = source, extra = 2; return value + extra;",
    )
    .unwrap();
    let mut memory = [0; 384];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn a_declaration_list_can_mix_multiple_object_patterns_and_a_binding() {
    let code = compile_script(
        "let first = { left: 20 }, second = { right: 20 }; let { left } = first, { right } = second, extra = 2; return left + right + extra;",
    )
    .unwrap();
    let mut memory = [0; 512];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn nested_object_patterns_follow_each_property_path() {
    let code = compile_script(
        "let source = { selection: { main: 42 } }; let { selection: { main: range } } = source; return range;",
    )
    .unwrap();
    let mut memory = [0; 384];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn a_hoisted_nested_function_captures_a_destructured_binding() {
    let code = compile_script(
        "function outer(source) { let { value = 1 } = source; let result = read(); function read() { return value; } return result; } return outer({ value: 42 });",
    )
    .unwrap();
    let mut memory = [0; 768];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
