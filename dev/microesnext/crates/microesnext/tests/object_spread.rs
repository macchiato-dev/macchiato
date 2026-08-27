use microesnext::{Machine, Outcome, Value};

#[test]
fn object_spread_copies_own_properties_before_later_properties() {
    let code = microesnext_compiler::compile_script(
        "let source = { answer: 40 }; let copy = { ...source, extra: 2 }; \
         return copy.answer + copy.extra;",
    )
    .unwrap();
    let mut memory = [0; 512];
    let outcome = Machine::new(&code, &mut memory).run().unwrap();
    assert_eq!(outcome, Outcome::Complete(Value::from_i30(42).unwrap()));
}

#[test]
fn object_spread_ignores_null_and_undefined_sources() {
    let code = microesnext_compiler::compile_script(
        "let copy = { before: 20, ...null, ...undefined, after: 22 }; \
         return copy.before + copy.after;",
    )
    .unwrap();
    let mut memory = [0; 512];
    let outcome = Machine::new(&code, &mut memory).run().unwrap();
    assert_eq!(outcome, Outcome::Complete(Value::from_i30(42).unwrap()));
}
