use microesnext::{Machine, Outcome, Value};
use microesnext_compiler::compile_script;

fn run(source: &str) -> Outcome {
    let code = compile_script(source).unwrap();
    let mut memory = [0; 512];
    Machine::new(&code, &mut memory)
        .run()
        .unwrap_or_else(|error| panic!("{error:?}; bytecode: {code:?}"))
}

#[test]
fn an_outer_capture_assignment_returns_and_stores_its_value() {
    assert_eq!(
        run("let value = 1; let set = () => { return value = 42; }; return set();"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn an_assignment_to_a_locally_held_cell_is_visible_to_a_closure() {
    assert_eq!(
        run("let value = 1; let read = () => value; \
             let assigned = value = 42; return read();"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn captured_and_plain_local_assignment_targets_compose_in_one_chain() {
    assert_eq!(
        run(
            "let captured = 0; let read = () => captured; let local = 0; \
             local = captured = 42; return read();"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn captured_postfix_updates_return_the_old_value_and_store_the_new_one() {
    assert_eq!(
        run("let value = 40; let update = () => value++; return update() + update() - 39;"),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn a_captured_parameter_can_be_reassigned_from_a_callback() {
    assert_eq!(
        run(
            "function update(value, callback) { callback(next => value = next); return value.answer; } \
             let first = { answer: 1 }; let second = { answer: 42 }; \
             return update(first, callback => callback(second));"
        ),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn a_method_reassigns_a_parameter_from_a_conditional_arrow_callback() {
    let source = "let field = { \
        update(value, transaction) { \
            if (transaction.changed) \
                transaction.each((from, to) => value = { answer: value.answer + from + to }); \
            return value.answer; \
        } \
    }; \
    let transaction = { changed: true, each(callback) { callback(1, 1); } }; \
    return field.update({ answer: 40 }, transaction);";
    assert_eq!(
        run(source),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn captured_assignment_keeps_its_cell_across_a_rhs_call() {
    let source = "function transform(value, amount) { return { answer: value.answer + amount }; } \
        function update(value, each) { \
            each(amount => value = transform(value, amount)); \
            return value.answer; \
        } \
        return update({ answer: 38 }, callback => { callback(2); callback(2); });";
    assert_eq!(
        run(source),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn captured_assignment_can_store_the_same_object_value() {
    let source = "function identity(value) { return value; } \
        function update(value, each) { \
            each(() => value = identity(value)); \
            return value.answer; \
        } \
        return update({ answer: 42 }, callback => callback());";
    assert_eq!(
        run(source),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn method_capture_survives_a_rhs_call_with_a_lexical_receiver() {
    let source = "function identity(value, _first, _second = _first) { let touched = false; value.each(() => touched = true); return touched ? value : value; } \
        let field = { \
            update(value, each) { \
                each((first, second) => value = identity(value, first, second)); \
                return value.answer; \
            } \
        }; \
        return field.update({ answer: 42, each(callback) { callback(); } }, callback => callback(1, 2));";
    assert_eq!(
        run(source),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn codemirror_style_nested_callbacks_preserve_the_outer_cell() {
    let source = "function clearTouched(value, from, to = from) { \
            let touched = false; \
            value.between(from, to, (a, b) => { if (a < to && b > from) touched = true; }); \
            return !touched ? value : value.update({}); \
        } \
        let field = { update(value, transaction) { \
            if (transaction.changed) \
                transaction.each((from, to) => value = clearTouched(value, from, to)); \
            return value.answer; \
        } }; \
        let value = { answer: 42, between(_from, _to, callback) { callback(3, 1); }, update() { return this; } }; \
        let transaction = { changed: true, each(callback) { callback(1, 2, 3, 4, value); callback(2, 3, 4, 5, value); } }; \
        function deep(count, callback) { return count ? deep(count - 1, callback) : callback(); } \
        return deep(24, () => field.update(value, transaction));";
    assert_eq!(
        run(source),
        Outcome::Complete(Value::from_i30(42).unwrap())
    );
}

#[test]
fn captured_cells_survive_an_externally_started_callback_frame() {
    let source = "function clearTouched(value) { let touched = false; value.each(() => touched = true); return touched ? value : value; } \
        let field = { update(value, transaction) { \
            transaction.each(() => value = clearTouched(value)); \
            value = value.map(); \
            return value.answer; \
        } }; \
        let value = { answer: 42, each(callback) { callback(); }, map() { return this; } }; \
        let transaction = { each(callback) { callback(); } }; \
        return () => field.update(value, transaction);";
    let code = compile_script(source).unwrap();
    let mut memory = [0; 4096];
    let mut machine = Machine::new(&code, &mut memory);
    let Outcome::Complete(callback) = machine.run().unwrap() else { panic!("closure") };
    assert_eq!(
        machine.call_closure_with_receiver(callback, Value::UNDEFINED, &[]),
        Ok(Outcome::Complete(Value::from_i30(42).unwrap()))
    );
}
