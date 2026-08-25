use microesnext::atoms::Atoms;
use microesnext::iterator_results::IteratorResultKeys;
use microesnext::{Value, array_iterators, arrays, collection_iterators, collections, objects};

#[test]
fn array_and_collection_adapters_share_the_result_boundary() {
    let mut memory = [0; 256];
    let mut arena = microesnext_arena::Arena::with_root_capacity(&mut memory, 3);
    let mut atoms = Atoms::new(&mut arena).unwrap();
    let results = IteratorResultKeys::new(&mut arena, &mut atoms).unwrap();
    let value_key = atoms.intern(&mut arena, b"value").unwrap();
    let done_key = atoms.intern(&mut arena, b"done").unwrap();

    let array = arrays::new(&mut arena).unwrap();
    let array = arrays::push(&mut arena, array, Value::TRUE).unwrap();
    let array_iterator = array_iterators::new_values(&mut arena, array).unwrap();
    let next = array_iterators::next(&mut arena, array_iterator).unwrap();
    let first = results.create_next(&mut arena, Value::NULL, next).unwrap();
    assert_eq!(objects::get(&arena, first, value_key), Ok(Value::TRUE));
    assert_eq!(objects::get(&arena, first, done_key), Ok(Value::FALSE));

    let set = collections::new_set(&mut arena).unwrap();
    let set = collections::add(&mut arena, set, Value::FALSE).unwrap();
    let set_iterator = collection_iterators::new_values(&mut arena, set).unwrap();
    let next = collection_iterators::next(&mut arena, set_iterator).unwrap();
    let first = results.create_next(&mut arena, Value::NULL, next).unwrap();
    assert_eq!(objects::get(&arena, first, value_key), Ok(Value::FALSE));
    assert_eq!(objects::get(&arena, first, done_key), Ok(Value::FALSE));

    let next = collection_iterators::next(&mut arena, set_iterator).unwrap();
    let exhausted = results.create_next(&mut arena, Value::NULL, next).unwrap();
    assert_eq!(
        objects::get(&arena, exhausted, value_key),
        Ok(Value::UNDEFINED)
    );
    assert_eq!(objects::get(&arena, exhausted, done_key), Ok(Value::TRUE));
}
