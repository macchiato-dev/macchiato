use microesnext::{HostRef, Machine, Outcome, Value};
use microesnext_compiler::{compile_script, compile_script_with_host_globals};

#[test]
fn an_instance_getter_runs_with_its_receiver() {
    let code = compile_script(
        "let Type = class { constructor(value) { this.value = value; } \
         get answer() { return this.value; } }; return new Type(42).answer;",
    )
    .unwrap();
    let mut memory = [0; 1536];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn an_instance_getter_can_return_an_object() {
    let code = compile_script(
        "let Type = class { constructor(value) { this.value = {answer: value}; } \
         get object() { return this.value; } }; return new Type(42).object.answer;",
    )
    .unwrap();
    let mut memory = [0; 1536];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn getters_declared_before_the_constructor_do_not_replace_it() {
    let code = compile_script(
        "let Type = class { get answer() { return this.value; } \
         constructor(value) { this.value = value; } }; return new Type(42).answer;",
    )
    .unwrap();
    let mut memory = [0; 1536];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn a_named_class_keeps_a_late_constructor_and_earlier_getter() {
    let code = compile_script(
        "let Type = class Inner { get answer() { return this.value; } \
         constructor(value) { this.value = value; } }; return new Type(42).answer;",
    )
    .unwrap();
    let mut memory = [0; 1536];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn a_late_constructor_keeps_default_parameters() {
    let code = compile_script(
        "let Type = class { get answer() { return this.value; } \
         constructor(value = 42) { this.value = value; } }; return new Type().answer;",
    )
    .unwrap();
    let mut memory = [0; 1536];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn a_late_constructor_resumes_after_a_host_call() {
    let code = compile_script_with_host_globals(
        "let Type = class { get answer() { return this.value; } \
         constructor() { this.value = hostValue(); } }; return new Type().answer;",
        &["hostValue"],
    )
    .unwrap();
    let mut memory = [0; 1536];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert!(matches!(machine.run(), Ok(Outcome::HostCall { .. })));
    machine.complete_host_call(Value::from_i30(42).unwrap()).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn a_late_constructor_resumes_after_a_host_method_call() {
    let code = compile_script_with_host_globals(
        "let Type = class { get answer() { return this.value; } \
         constructor() { this.value = host.value(); } }; return new Type().answer;",
        &["host"],
    )
    .unwrap();
    let mut memory = [0; 1536];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    let function = HostRef::new(7).unwrap();
    assert!(matches!(machine.run(), Ok(Outcome::HostGet { .. })));
    machine.complete_host_operation(Value::from_host(function)).unwrap();
    assert!(matches!(machine.run(), Ok(Outcome::HostCall { .. })));
    machine.complete_host_call(Value::from_i30(42).unwrap()).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn a_late_constructor_resumes_a_host_call_through_nested_functions() {
    let code = compile_script_with_host_globals(
        "function exchange() { return hostValue(); } \
         function immediate() { return exchange(); } \
         let Type = class { get answer() { return this.value; } \
         constructor() { this.value = immediate(); } }; return new Type().answer;",
        &["hostValue"],
    )
    .unwrap();
    let mut memory = [0; 2048];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert!(matches!(machine.run(), Ok(Outcome::HostCall { .. })));
    machine.complete_host_call(Value::from_i30(42).unwrap()).unwrap();
    assert_eq!(
        machine.run(),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}

#[test]
fn externally_entered_closure_preserves_host_backed_getter_results() {
    let code = compile_script_with_host_globals(
        "let Measurements = class { \
           constructor() {} \
           get scrollTop() { return host(0); } \
           get scrollHeight() { return host(10); } \
           get clientHeight() { return host(5); } \
         }; \
         let element = new Measurements(); \
         function measure() { \
           return element.scrollTop > element.scrollHeight - element.clientHeight - 4; \
         } \
         return measure;",
        &["host"],
    )
    .unwrap();
    let mut memory = [0; 4096];
    let mut machine = Machine::with_objects(&code, &mut memory, 12).unwrap();
    let Outcome::Complete(function) = machine.run().unwrap() else {
        panic!("expected the startup closure")
    };
    let mut outcome = machine
        .call_closure_with_receiver(function, Value::UNDEFINED, &[])
        .unwrap();
    for expected in [0, 10, 5] {
        let Outcome::HostCall { .. } = outcome else {
            panic!("expected a getter host call")
        };
        assert_eq!(machine.host_argument(0).unwrap().as_i30(), Some(expected));
        machine.complete_host_call(Value::from_i30(expected).unwrap()).unwrap();
        outcome = machine.run().unwrap();
    }
    assert_eq!(outcome, Outcome::Complete(Value::FALSE));
}

#[test]
fn externally_entered_closure_preserves_composed_host_backed_getters() {
    let code = compile_script_with_host_globals(
        "function stringIndex(name) { return name.length; } \
         function immediate(operation) { return host(operation[3]); } \
         let Measurements = class { \
           constructor() { this.reference = 7; } \
           get scrollHeight() { \
             return immediate([1, this.reference, stringIndex('scrollHeight'), 10]); \
           } \
           get clientHeight() { \
             return immediate([1, this.reference, stringIndex('clientHeight'), 5]); \
           } \
         }; \
         let element = new Measurements(); \
         function measure() { return element.scrollHeight - element.clientHeight - 4; } \
         return measure;",
        &["host"],
    )
    .unwrap();
    let mut memory = [0; 8192];
    let mut machine = Machine::with_objects(&code, &mut memory, 12).unwrap();
    let Outcome::Complete(function) = machine.run().unwrap() else {
        panic!("expected the startup closure")
    };
    let mut outcome = machine
        .call_closure_with_receiver(function, Value::UNDEFINED, &[])
        .unwrap();
    for expected in [10, 5] {
        let Outcome::HostCall { .. } = outcome else {
            panic!("expected a getter host call")
        };
        assert_eq!(machine.host_argument(0).unwrap().as_i30(), Some(expected));
        machine.complete_host_call(Value::from_i30(expected).unwrap()).unwrap();
        outcome = machine.run().unwrap();
    }
    assert_eq!(outcome, Outcome::Complete(Value::from_i30(1).unwrap()));
}

#[test]
fn an_instance_with_getters_can_assign_several_plain_properties() {
    let code = compile_script(
        "let Rule = class { constructor(tags, mode, context, next) { \
           this.tags = tags; this.mode = mode; this.context = context; this.next = next; \
         } get depth() { return this.context ? this.context.length : 0; } }; \
         let rule = new Rule([], 2, null); rule.next = new Rule([], 1, null); \
         return rule.next.mode;",
    ).unwrap();
    let mut memory = [0; 512];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(1).unwrap())));
}

#[test]
fn a_bound_function_keeps_its_receiver_and_leading_arguments() {
    let code = compile_script(
        "let object = {}; function add(left, right) { this.total = left + right; } \
         let bound = add.bind(object, 20); bound(22); return object.total;",
    ).unwrap();
    let mut memory = [0; 1536];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    let bind = HostRef::new(7).unwrap();
    machine.install_function_bind(bind);
    assert!(matches!(machine.run(), Ok(Outcome::HostCall { function, .. }) if function == bind));
    machine.complete_function_bind().unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(42).unwrap())));
}

#[test]
fn a_defaulted_destructured_local_can_be_reassigned() {
    let code = compile_script(
        "function update(spec) { let { add = [], sort = false } = spec; \
         if (sort) add = []; return add.length; } \
         return update({add: [1, 2], sort: true});",
    ).unwrap();
    let mut memory = [0; 2048];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(0).unwrap())));
}

#[test]
fn a_captured_local_survives_a_synchronous_callback() {
    let code = compile_script(
        "function call(callback) { callback(); } \
         function count() { let value = 1; call(() => value++); value++; return value; } \
         return count();",
    )
    .unwrap();
    let mut memory = [0; 2048];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(3).unwrap())));
}

#[test]
fn a_recursive_arrow_keeps_its_lexical_receiver() {
    let code = compile_script(
        "let Counter = class { constructor() { this.answer = 42; } \
         run() { let descend = value => value ? descend(value - 1) : this.answer; \
         return descend(3); } }; return new Counter().run();",
    )
    .unwrap();
    let mut memory = [0; 2048];
    let mut machine = Machine::with_objects(&code, &mut memory, 8).unwrap();
    assert_eq!(machine.run(), Ok(Outcome::Complete(Value::from_i30(42).unwrap())));
}
