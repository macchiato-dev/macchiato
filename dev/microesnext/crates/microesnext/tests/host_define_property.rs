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

#[test]
fn externally_entered_closure_reads_host_defined_getters() {
    let code = compile_script_with_host_globals(
        "function Measurements() {} \
         var prototype = Measurements.prototype; \
         function install(name, value) { \
           Object.defineProperty(prototype, name, { \
             get: function () { return host(value)[0]; } \
           }); \
         } \
         install('scrollTop', 0); \
         install('scrollHeight', 10); \
         install('clientHeight', 5); \
         var element = new Measurements(); \
         function measure() { \
           return element.scrollTop > Math.max(1, \
             element.scrollHeight - element.clientHeight - 4); \
         } \
         function descend(depth) { return depth ? descend(depth - 1) : measure(); } \
         return function () { return descend(12); };",
        &["Object", "host", "Math"],
    )
    .unwrap();
    let mut memory = [0; 8192];
    let mut machine = Machine::with_objects(&code, &mut memory, 12).unwrap();
    let define_property = HostRef::new(20).unwrap();
    for _ in 0..3 {
        assert!(matches!(machine.run(), Ok(Outcome::HostGet { .. })));
        machine.complete_host_operation(Value::from_host(define_property)).unwrap();
        assert!(matches!(machine.run(), Ok(Outcome::HostCall { .. })));
        let object = machine.host_argument(0).unwrap();
        let key = machine.host_argument(1).unwrap();
        let descriptor = machine.host_argument(2).unwrap();
        let object = machine.define_property(object, key, descriptor).unwrap();
        machine.complete_host_call(object).unwrap();
    }
    let Outcome::Complete(function) = machine.run().unwrap() else {
        panic!("expected the startup closure")
    };
    let outcome = machine
        .call_closure_with_receiver(function, Value::UNDEFINED, &[])
        .unwrap();
    let complete_getter = |machine: &mut Machine<'_, '_>, outcome: Outcome, expected| {
        let Outcome::HostCall { function, .. } = outcome else {
            panic!("expected a getter host call");
        };
        assert_eq!(function, HostRef::new(1).unwrap());
        assert_eq!(machine.host_argument(0).unwrap().as_i30(), Some(expected));
        let array = microesnext::arrays::new(machine.arena_mut()).unwrap();
        let array = microesnext::arrays::set(
            machine.arena_mut(), array, 0, Value::from_i30(expected).unwrap(),
        )
        .unwrap();
        machine.complete_host_call(array).unwrap();
        machine.run().unwrap()
    };
    let outcome = complete_getter(&mut machine, outcome, 0);
    let Outcome::HostGet { object, .. } = outcome else {
        panic!("expected Math.max lookup");
    };
    assert_eq!(object, HostRef::new(2).unwrap());
    let maximum = HostRef::new(21).unwrap();
    machine.complete_host_operation(Value::from_host(maximum)).unwrap();
    let outcome = machine.run().unwrap();
    let outcome = complete_getter(&mut machine, outcome, 10);
    let outcome = complete_getter(&mut machine, outcome, 5);
    let Outcome::HostCall { function, argument_count, .. } = outcome else {
        panic!("expected Math.max call");
    };
    assert_eq!(function, maximum);
    assert_eq!(argument_count, 2);
    machine.complete_host_call(Value::from_i30(1).unwrap()).unwrap();
    let outcome = machine.run().unwrap();
    assert_eq!(outcome, Outcome::Complete(Value::FALSE));
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
fn assignment_invokes_a_setter_inherited_from_the_prototype() {
    let code = compile_script_with_host_globals(
        "function Element() {} \
         var seen = 0; \
         Object.defineProperty(Element.prototype, 'onkeyup', { \
           set: function (callback) { seen = callback(); } \
         }); \
         var element = new Element(); \
         element.onkeyup = function () { return 42; }; \
         return seen;",
        &["Object"],
    )
    .unwrap();
    let mut memory = [0; 8192];
    let mut machine = Machine::with_objects(&code, &mut memory, 12).unwrap();
    let define_property = HostRef::new(20).unwrap();

    let first = machine.run();
    assert!(matches!(first, Ok(Outcome::HostGet { .. })), "{first:?}");
    machine.complete_host_operation(Value::from_host(define_property)).unwrap();
    assert!(matches!(machine.run(), Ok(Outcome::HostCall { .. })));
    let object = machine.host_argument(0).unwrap();
    let key = machine.host_argument(1).unwrap();
    let descriptor = machine.host_argument(2).unwrap();
    let object = machine.define_property(object, key, descriptor).unwrap();
    machine.complete_host_call(object).unwrap();

    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(42).unwrap())));
}

#[test]
fn computed_assignment_invokes_an_inherited_setter() {
    let code = compile_script_with_host_globals(
        "function Element() {} \
         var seen = 0; \
         Object.defineProperty(Element.prototype, 'onkeyup', { \
           set: function (callback) { seen = callback(); } \
         }); \
         var element = new Element(); \
         element['onkeyup'] = function () { return 42; }; \
         return seen;",
        &["Object"],
    )
    .unwrap();
    let mut memory = [0; 8192];
    let mut machine = Machine::with_objects(&code, &mut memory, 12).unwrap();
    let define_property = HostRef::new(20).unwrap();

    assert!(matches!(machine.run(), Ok(Outcome::HostGet { .. })));
    machine.complete_host_operation(Value::from_host(define_property)).unwrap();
    assert!(matches!(machine.run(), Ok(Outcome::HostCall { .. })));
    let object = machine.host_argument(0).unwrap();
    let key = machine.host_argument(1).unwrap();
    let descriptor = machine.host_argument(2).unwrap();
    let object = machine.define_property(object, key, descriptor).unwrap();
    machine.complete_host_call(object).unwrap();

    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(42).unwrap())));
}

#[test]
fn computed_array_assignment_keeps_array_bookkeeping_intact() {
    let code = microesnext_compiler::compile_script(
        "var values = []; \
         function push(value) { values[values.length] = value; return values.length; } \
         return push(10) * 100 + push(20) * 10 + values[0] + values[1];",
    )
    .unwrap();
    let mut memory = [0; 4096];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(150).unwrap())));
}

#[test]
fn loop_defined_inherited_setters_retain_their_property_names() {
    let code = compile_script_with_host_globals(
        "function Element() {} \
         var seen = ''; \
         function install(type) { \
           Object.defineProperty(Element.prototype, 'on' + type, { \
             set: function () { seen = seen + type; } \
           }); \
         } \
         install('change'); \
         install('keyup'); \
         var element = new Element(); \
         element.onkeyup = function () {}; \
         return seen;",
        &["Object"],
    )
    .unwrap();
    let mut memory = [0; 16384];
    let mut machine = Machine::with_objects(&code, &mut memory, 16).unwrap();
    let define_property = HostRef::new(20).unwrap();

    let mut defined = 0;
    let value = loop {
        match machine.run().unwrap() {
            Outcome::HostGet { .. } => {
                machine.complete_host_operation(Value::from_host(define_property)).unwrap();
            }
            Outcome::HostCall { .. } => {
                let object = machine.host_argument(0).unwrap();
                let key = machine.host_argument(1).unwrap();
                let descriptor = machine.host_argument(2).unwrap();
                let object = machine.define_property(object, key, descriptor).unwrap();
                machine.complete_host_call(object).unwrap();
                defined += 1;
            }
            Outcome::Complete(value) => break value,
            outcome => panic!("unexpected {outcome:?}"),
        }
    };
    assert_eq!(defined, 2);
    assert_eq!(machine.string_bytes(value), Ok(b"keyup".as_slice()));
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
