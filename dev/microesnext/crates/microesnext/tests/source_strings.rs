use microesnext::{Machine, Outcome};
use microesnext_compiler::compile_script;

#[test]
fn source_strings_execute_through_the_removable_string_runtime() {
    for (source, expected) in [
        ("return \"hello\\nworld\";", &b"hello\nworld"[..]),
        ("return `UTF-8: café`;", "UTF-8: café".as_bytes()),
    ] {
        let code = compile_script(source).unwrap();
        let mut memory = [0; 64];
        let mut machine = Machine::new(&code, &mut memory);
        let Outcome::Complete(value) = machine.run().unwrap() else {
            panic!("expected a completed string program")
        };
        assert!(
            machine
                .arena()
                .bytes_equal(value.as_ref().unwrap(), expected)
                .unwrap()
        );
    }
}
