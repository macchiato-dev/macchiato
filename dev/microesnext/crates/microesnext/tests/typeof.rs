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
