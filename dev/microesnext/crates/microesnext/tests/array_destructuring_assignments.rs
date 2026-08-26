use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

#[test]
fn array_destructuring_reassigns_existing_locals() {
    let code =
        compile_script("let left = 0, right = 0; [left, right] = [40, 2]; return left + right;")
            .unwrap();
    let mut memory = [0; 256];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn array_destructuring_reassigns_bindings_captured_by_an_arrow() {
    let code = compile_script(
        "let left = 0, right = 0; let swap = () => { [left, right] = [40, 2]; }; swap(); return left + right;",
    )
    .unwrap();
    let mut memory = [0; 512];
    assert_eq!(
        Machine::new(&code, &mut memory).run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[cfg(feature = "objects")]
#[test]
fn array_destructuring_can_mix_property_and_local_targets() {
    let code = compile_script(
        "let object = { value: 1 }, local = 42; \
         [object.value, local] = [local, object.value]; return object.value;",
    )
    .unwrap();
    let mut memory = [0; 768];
    assert_eq!(
        Machine::with_objects(&code, &mut memory, 8)
            .unwrap()
            .run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
