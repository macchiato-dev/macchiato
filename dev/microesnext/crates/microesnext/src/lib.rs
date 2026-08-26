#![no_std]

pub use microesnext_bytecode as bytecode;
pub use microesnext_execution::core::{Core, CoreOutcome};
pub use microesnext_types::{Error, HeapRef, HostRef, Value};
pub use microesnext_vm::{Machine, Outcome};

#[cfg(feature = "locals")]
pub use microesnext_bindings::locals;

#[cfg(feature = "integer-operations")]
pub use microesnext_semantics::integer_operations;

#[cfg(feature = "integer-negation")]
pub use microesnext_semantics::integer_operations::negation as integer_negation;

#[cfg(feature = "instanceof")]
pub use microesnext_objects::instanceof;

#[cfg(feature = "logical-operations")]
pub use microesnext_semantics::logical_operations;

#[cfg(feature = "method-calls")]
pub use microesnext_objects::method_calls;

#[cfg(feature = "arrays")]
pub use microesnext_objects::arrays;

#[cfg(feature = "array-assignment-expressions")]
pub use microesnext_objects::arrays::assignment_expressions as array_assignment_expressions;

#[cfg(feature = "array-iterators")]
pub use microesnext_objects::arrays::iterators as array_iterators;

#[cfg(any(feature = "atoms", feature = "iterator-results"))]
pub use microesnext_values::strings::atoms;

#[cfg(feature = "async")]
pub use microesnext_scheduler::async_driver as r#async;

#[cfg(feature = "async-functions")]
pub use microesnext_execution::async_functions;

#[cfg(feature = "async-thenables")]
pub use microesnext_scheduler::async_thenables;

#[cfg(feature = "collections")]
pub use microesnext_objects::collections;

#[cfg(feature = "callable-objects")]
pub use microesnext_objects::callable as callable_objects;

#[cfg(feature = "class-constructors")]
pub use microesnext_objects::class_constructor as class_constructors;

#[cfg(feature = "collection-iterators")]
pub use microesnext_objects::collections::iterators as collection_iterators;

#[cfg(feature = "collection-entry-iterators")]
pub use microesnext_objects::collections::entry_iterators as collection_entry_iterators;

#[cfg(feature = "iterators")]
pub use microesnext_objects::iterators;

#[cfg(feature = "iterator-results")]
pub use microesnext_objects::iterators::results as iterator_results;

#[cfg(feature = "iterable-protocol")]
pub use microesnext_objects::iterators::protocol as iterable_protocol;

#[cfg(feature = "functions")]
pub use microesnext_arena::closures as functions;
#[cfg(feature = "function-arguments")]
pub use microesnext_bindings::parameters;
#[cfg(feature = "typeof")]
pub use microesnext_semantics::r#typeof;
#[cfg(feature = "numbers")]
pub use microesnext_values::numbers;
#[cfg(feature = "number-coercion")]
pub use microesnext_values::numbers::coercion as number_coercion;
#[cfg(feature = "number-division")]
pub use microesnext_values::numbers::division as number_division;
#[cfg(feature = "number-negation")]
pub use microesnext_values::numbers::negation as number_negation;
#[cfg(feature = "number-operations")]
pub use microesnext_values::numbers::operations as number_operations;
#[cfg(feature = "number-remainder")]
pub use microesnext_values::numbers::remainder as number_remainder;
#[cfg(feature = "string-number-coercion")]
pub use microesnext_values::numbers::string_coercion as string_number_coercion;

#[cfg(feature = "exceptions")]
pub use microesnext_execution::exceptions;

#[cfg(feature = "errors")]
pub use microesnext_values::errors;

#[cfg(feature = "equality")]
pub use microesnext_semantics::equality;

#[cfg(feature = "environments")]
pub use microesnext_bindings::environments;

#[cfg(feature = "captured-assignment-expressions")]
pub use microesnext_bindings::environments::assignment_expressions as captured_assignment_expressions;

#[cfg(feature = "property-assignment-expressions")]
pub use microesnext_objects::assignment_expressions as property_assignment_expressions;

#[cfg(feature = "recursive-functions")]
pub use microesnext_bindings::recursive_functions;

#[cfg(feature = "recursive-async-functions")]
pub use microesnext_execution::recursive_async_functions;

#[cfg(feature = "receivers")]
pub use microesnext_bindings::receivers;

#[cfg(any(
    feature = "objects",
    feature = "iterator-results",
    feature = "iterable-protocol"
))]
pub use microesnext_objects as objects;

#[cfg(feature = "strings")]
pub use microesnext_values::strings;

#[cfg(feature = "stack-operations")]
pub use microesnext_arena::stack_operations;

#[cfg(feature = "string-operations")]
pub use microesnext_values::strings::operations as string_operations;

#[cfg(feature = "symbols")]
pub use microesnext_values::symbols;

#[cfg(feature = "well-known-symbols")]
pub use microesnext_values::symbols::well_known as well_known_symbols;

#[cfg(feature = "weak-collections")]
pub use microesnext_objects::collections::weak as weak_collections;

#[cfg(feature = "promises")]
pub use microesnext_execution::promises;

#[cfg(feature = "promise-resolution")]
pub use microesnext_execution::promises::resolution as promise_resolution;

#[cfg(feature = "prototype-chain")]
pub use microesnext_objects::prototype_chain;

#[cfg(feature = "promise-resolvers")]
pub use microesnext_execution::promises::resolvers as promise_resolvers;

#[cfg(feature = "thenables")]
pub use microesnext_scheduler::thenables;
