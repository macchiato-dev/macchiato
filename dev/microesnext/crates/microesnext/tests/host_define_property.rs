use microesnext::{HostRef, Machine, Outcome, Value};
use microesnext_compiler::compile_script_with_host_globals;

#[test]
fn an_ordinary_function_can_return_an_object() {
    let code = microesnext_compiler::compile_script(
        "var getter = function () { return { answer: 42 }; }; \
         return getter().answer;",
    )
    .unwrap();
    let mut memory = [0; 2048];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn a_host_defined_getter_can_return_a_primitive() {
    run_host_defined_getter(
        "get: function () { return 42; }",
        Value::from_i30(42).unwrap(),
    );
}

fn run_host_defined_getter(descriptor: &str, expected: Value) {
    let source = format!(
        "var prototype = {{}}; Object.defineProperty(prototype, 'head', {{ {descriptor} }}); \
         return prototype.head;"
    );
    let code = compile_script_with_host_globals(&source, &["Object"]).unwrap();
    let mut memory = [0; 4096];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    let define_property = HostRef::new(20).unwrap();
    let Outcome::HostGet { .. } = machine.run().unwrap() else { panic!() };
    machine.complete_host_operation(Value::from_host(define_property)).unwrap();
    let Outcome::HostCall { .. } = machine.run().unwrap() else { panic!() };
    let object = machine.host_argument(0).unwrap();
    let key = machine.host_argument(1).unwrap();
    let descriptor = machine.host_argument(2).unwrap();
    let object = machine.define_property(object, key, descriptor).unwrap();
    machine.complete_host_call(object).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(expected)));
}

#[test]
fn a_host_defined_getter_can_return_an_object() {
    let code = compile_script_with_host_globals(
        "var prototype = {}; \
         Object.defineProperty(prototype, 'head', { \
           get: function () { return { answer: 42 }; } \
         }); \
         return prototype.head.answer;",
        &["Object"],
    )
    .unwrap();
    let mut memory = [0; 4096];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    let define_property = HostRef::new(20).unwrap();

    match machine.run().unwrap() {
        Outcome::HostGet { object, key, .. } => {
            assert_eq!(object, HostRef::new(0).unwrap());
            assert_eq!(machine.string_bytes(key), Ok(b"defineProperty".as_slice()));
            machine
                .complete_host_operation(Value::from_host(define_property))
                .unwrap();
        }
        outcome => panic!("expected Object.defineProperty lookup, got {outcome:?}"),
    }

    match machine.run().unwrap() {
        Outcome::HostCall {
            function,
            argument_count,
            ..
        } => {
            assert_eq!(function, define_property);
            assert_eq!(argument_count, 3);
            let object = machine.host_argument(0).unwrap();
            let key = machine.host_argument(1).unwrap();
            let descriptor = machine.host_argument(2).unwrap();
            let get_key = machine.intern_atom(b"get").unwrap();
            let descriptor_getter = microesnext::objects::get(machine.arena(), descriptor, get_key)
                .unwrap();
            let descriptor_closure = microesnext::callable_objects::callable(
                machine.arena(),
                descriptor_getter,
            )
            .unwrap();
            let object = machine.define_property(object, key, descriptor).unwrap();
            let accessor = microesnext::objects::get(machine.arena(), object, key).unwrap();
            let getter = microesnext::objects::getters::callable(machine.arena(), accessor)
                .unwrap()
                .unwrap();
            assert_eq!(getter, descriptor_closure);
            machine.complete_host_call(object).unwrap();
        }
        outcome => panic!("expected Object.defineProperty call, got {outcome:?}"),
    }

    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap())),
    );
}
