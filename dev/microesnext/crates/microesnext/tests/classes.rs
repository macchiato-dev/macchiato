use microesnext::{Error, Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Result<Outcome, Error> {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 768];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    machine.run()
}

#[test]
fn class_constructors_initialize_instances() {
    let outcome = run(
        "class Rectangle { constructor(width) { this.width = width; } } \
         let rectangle = new Rectangle(42); \
         return rectangle.width;",
    )
    .unwrap();

    assert_eq!(outcome, Outcome::Complete(Value::from_i30(42).unwrap()));
}

#[test]
fn class_constructors_reject_ordinary_calls() {
    assert_eq!(
        run("class Rectangle { constructor() {} } return Rectangle();"),
        Err(Error::Type)
    );
}

#[test]
fn classes_are_functions_for_typeof_and_constructors_for_instanceof() {
    let outcome = run("class Rectangle { constructor() {} } \
         let rectangle = new Rectangle(); \
         return rectangle instanceof Rectangle;")
    .unwrap();
    assert_eq!(outcome, Outcome::Complete(Value::TRUE));

    let code =
        compile_script("class Rectangle { constructor() {} } return typeof Rectangle;").unwrap();
    let mut memory = [0; 768];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    let Outcome::Complete(value) = machine.run().unwrap() else {
        panic!("expected typeof completion")
    };
    assert!(
        machine
            .arena()
            .bytes_equal(value.as_ref().unwrap(), b"function")
            .unwrap()
    );
}
