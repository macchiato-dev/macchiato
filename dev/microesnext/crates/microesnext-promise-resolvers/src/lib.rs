#![no_std]

use microesnext_arena::{Arena, BlockKind};
use microesnext_promises::{JobQueue, Settlement, settle};
use microesnext_types::{Error, Value};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Pair {
    pub resolve: Value,
    pub reject: Value,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Call {
    pub destination: Value,
    pub settlement: Settlement,
    pub argument: Value,
}

/// Creates two guest-callable records sharing one `alreadyResolved` cell.
pub fn new(arena: &mut Arena<'_>, destination: Value) -> Result<Pair, Error> {
    let cell = arena.allocate_values(
        BlockKind::PromiseResolutionCell,
        &mut [Value::FALSE],
        &mut [destination],
    )?;
    let mut live = [destination, Value::from_ref(cell)];
    let resolve = arena.allocate_values(
        BlockKind::PromiseResolver,
        &mut [live[0], live[1], Value::FALSE],
        &mut live,
    )?;
    let mut live = [live[0], live[1], Value::from_ref(resolve)];
    let reject = arena.allocate_values(
        BlockKind::PromiseResolver,
        &mut [live[0], live[1], Value::TRUE],
        &mut live,
    )?;
    Ok(Pair {
        resolve: live[2],
        reject: Value::from_ref(reject),
    })
}

pub fn is_resolver(arena: &Arena<'_>, value: Value) -> bool {
    value
        .as_ref()
        .and_then(|reference| arena.kind(reference).ok())
        == Some(BlockKind::PromiseResolver)
}

/// Consumes a resolver invocation after its callable has been removed from the
/// operand stack. Extra arguments are discarded as JavaScript requires.
pub fn take_call(
    arena: &mut Arena<'_>,
    resolver: Value,
    argument_count: usize,
) -> Result<Option<Call>, Error> {
    let base = arena
        .stack_len()
        .checked_sub(argument_count)
        .ok_or(Error::StackUnderflow)?;
    let argument = if argument_count == 0 {
        Value::UNDEFINED
    } else {
        arena.stack_value_from_bottom(base)?
    };
    arena.truncate_stack(base)?;

    claim(arena, resolver, argument)
}

/// Rejects after the called `then` function throws, unless either resolving
/// function already won the shared cell.
pub fn reject_if_open(
    arena: &mut Arena<'_>,
    reject: Value,
    reason: Value,
) -> Result<Option<Call>, Error> {
    let call = claim(arena, reject, reason)?;
    if call.is_some_and(|call| call.settlement != Settlement::Rejected) {
        return Err(Error::Type);
    }
    Ok(call)
}

fn claim(arena: &mut Arena<'_>, resolver: Value, argument: Value) -> Result<Option<Call>, Error> {
    let resolver = checked(arena, resolver, BlockKind::PromiseResolver)?;
    let fields = arena.values(resolver)?;
    let [destination, cell, reject] = fields else {
        return Err(Error::DanglingReference);
    };
    let destination = Value::from_raw(*destination);
    let cell = checked(
        arena,
        Value::from_raw(*cell),
        BlockKind::PromiseResolutionCell,
    )?;
    let settlement = match Value::from_raw(*reject) {
        Value::FALSE => Settlement::Fulfilled,
        Value::TRUE => Settlement::Rejected,
        _ => return Err(Error::DanglingReference),
    };
    let state = arena.values(cell)?;
    let [already_resolved] = state else {
        return Err(Error::DanglingReference);
    };
    if Value::from_raw(*already_resolved) == Value::TRUE {
        return Ok(None);
    }
    arena.set_value(cell, 0, Value::TRUE)?;
    Ok(Some(Call {
        destination,
        settlement,
        argument,
    }))
}

/// Applies the winning resolver call. Fulfillment uses the native resolution
/// procedure so a returned engine Promise is adopted rather than nested.
pub fn settle_call(
    arena: &mut Arena<'_>,
    queue: &mut JobQueue<'_>,
    call: Call,
) -> Result<(), Error> {
    match call.settlement {
        Settlement::Fulfilled => {
            microesnext_promise_resolution::resolve_native(
                arena,
                queue,
                call.destination,
                call.argument,
            )?;
        }
        Settlement::Rejected => {
            settle(
                arena,
                queue,
                call.destination,
                Settlement::Rejected,
                call.argument,
            )?;
        }
    }
    Ok(())
}

fn checked(
    arena: &Arena<'_>,
    value: Value,
    kind: BlockKind,
) -> Result<microesnext_types::HeapRef, Error> {
    let reference = value.as_ref().ok_or(Error::Type)?;
    if arena.kind(reference)? != kind {
        return Err(Error::Type);
    }
    Ok(reference)
}

#[cfg(test)]
mod tests {
    use super::*;
    use microesnext_promises::{JobSlot, pending, settled_result};

    #[test]
    fn either_resolver_wins_exactly_once() {
        let mut memory = [0; 96];
        let mut arena = Arena::new(&mut memory);
        let destination = pending(&mut arena).unwrap();
        let pair = new(&mut arena, destination).unwrap();
        let answer = Value::from_i30(42).unwrap();
        arena.push(answer).unwrap();

        let call = take_call(&mut arena, pair.resolve, 1).unwrap().unwrap();
        assert_eq!(
            call,
            Call {
                destination,
                settlement: Settlement::Fulfilled,
                argument: answer,
            }
        );
        let mut slots: [Option<JobSlot>; 0] = [];
        let mut queue = JobQueue::new(&mut slots);
        settle_call(&mut arena, &mut queue, call).unwrap();
        assert_eq!(
            settled_result(&arena, destination),
            Ok(Some((Settlement::Fulfilled, answer)))
        );
        arena.push(Value::FALSE).unwrap();
        assert_eq!(take_call(&mut arena, pair.reject, 1), Ok(None));
        assert_eq!(arena.stack_len(), 0);
    }

    #[test]
    fn missing_argument_becomes_undefined_and_extra_arguments_are_discarded() {
        let mut memory = [0; 96];
        let mut arena = Arena::new(&mut memory);
        let destination = pending(&mut arena).unwrap();
        let pair = new(&mut arena, destination).unwrap();
        assert_eq!(
            take_call(&mut arena, pair.reject, 0)
                .unwrap()
                .unwrap()
                .argument,
            Value::UNDEFINED
        );

        let destination = pending(&mut arena).unwrap();
        let pair = new(&mut arena, destination).unwrap();
        arena.push(Value::TRUE).unwrap();
        arena.push(Value::FALSE).unwrap();
        assert_eq!(
            take_call(&mut arena, pair.resolve, 2)
                .unwrap()
                .unwrap()
                .argument,
            Value::TRUE
        );
        assert_eq!(arena.stack_len(), 0);
    }
}
