use microesnext::{Machine, Outcome};
use microesnext_compiler::compile_script;

#[test]
fn template_literals_join_primitive_substitutions() {
    let code = compile_script(
        "let position = 42; return `position ${position}, enabled ${true}, value ${null}`;",
    )
    .unwrap();
    let mut memory = [0; 256];
    let mut machine = Machine::new(&code, &mut memory);
    let Outcome::Complete(value) = machine.run().unwrap() else {
        panic!("expected a completed string program")
    };
    assert!(
        machine
            .arena()
            .bytes_equal(
                value.as_ref().unwrap(),
                b"position 42, enabled true, value null"
            )
            .unwrap()
    );
}
