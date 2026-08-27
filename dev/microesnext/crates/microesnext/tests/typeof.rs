use microesnext::{Machine, Outcome};
use microesnext_compiler::compile_script;

#[test]
fn source_typeof_classifies_representative_language_values() {
    for (source, expected) in [
        ("return typeof undefined;", &b"undefined"[..]),
        ("return typeof null;", &b"object"[..]),
        ("return typeof true;", &b"boolean"[..]),
        ("return typeof 1.25;", &b"number"[..]),
        ("return typeof 'value';", &b"string"[..]),
        ("return typeof {};", &b"object"[..]),
        (
            "return typeof function () { return undefined; };",
            &b"function"[..],
        ),
    ] {
        let code = compile_script(source).unwrap();
        let mut memory = [0; 160];
        let mut machine = Machine::with_objects(&code, &mut memory, 4).unwrap();
        let Outcome::Complete(value) = machine.run().unwrap() else {
            panic!("expected completed typeof expression")
        };
        assert!(
            machine
                .arena()
                .bytes_equal(value.as_ref().unwrap(), expected)
                .unwrap(),
            "{source}"
        );
    }
}

#[test]
fn typeof_binds_before_strict_comparison() {
    let code = compile_script(
        "var callback = function () {}; return typeof callback !== 'function';",
    ).unwrap();
    let mut memory = [0; 192];
    let mut machine = Machine::with_objects(&code, &mut memory, 4).unwrap();
    assert_eq!(machine.run().unwrap(), Outcome::Complete(microesnext::Value::FALSE));
}

#[test]
fn closure_is_distinct_from_null_and_undefined() {
    let code = compile_script(
        "var callback = function () {}; return callback !== null && callback !== undefined;",
    ).unwrap();
    let mut memory = [0; 192];
    let mut machine = Machine::with_objects(&code, &mut memory, 4).unwrap();
    assert_eq!(machine.run().unwrap(), Outcome::Complete(microesnext::Value::TRUE));
}

#[test]
fn typeof_classifies_a_closure_function_argument() {
    let code = compile_script(
        "function kind(value) { return typeof value; } return kind(function () {});",
    ).unwrap();
    let mut memory = [0; 224];
    let mut machine = Machine::with_objects(&code, &mut memory, 4).unwrap();
    let Outcome::Complete(value) = machine.run().unwrap() else { panic!("expected value") };
    assert!(machine.arena().bytes_equal(value.as_ref().unwrap(), b"function").unwrap());
}
