#![no_std]

use microesnext_arena::Arena;
use microesnext_promises::{JobQueue, Settlement, is_promise, settle, then};
use microesnext_types::{Error, Value};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Resolution {
    Fulfilled(Value),
    Adopted(Value),
    Rejected(Value),
}

/// Resolve a Promise with a plain guest value or another native Promise.
///
pub fn resolve_native(
    arena: &mut Arena<'_>,
    queue: &mut JobQueue<'_>,
    promise: Value,
    resolution: Value,
) -> Result<Resolution, Error> {
    if promise == resolution {
        let mut live = [promise];
        let reason =
            microesnext_errors::new(arena, microesnext_errors::ErrorKind::Type, &mut live)?;
        settle(arena, queue, live[0], Settlement::Rejected, reason)?;
        return Ok(Resolution::Rejected(live[0]));
    }
    if is_promise(arena, resolution) {
        then(
            arena,
            queue,
            resolution,
            Value::UNDEFINED,
            Value::UNDEFINED,
            promise,
        )?;
        return Ok(Resolution::Adopted(promise));
    }
    settle(arena, queue, promise, Settlement::Fulfilled, resolution)?;
    Ok(Resolution::Fulfilled(promise))
}

#[cfg(test)]
mod tests {
    use microesnext_promises::{JobSlot, pending, settled_result};

    use super::*;

    #[test]
    fn fulfills_with_a_plain_value() {
        let mut memory = [0; 48];
        let mut arena = Arena::new(&mut memory);
        let promise = pending(&mut arena).unwrap();
        let mut slots: [Option<JobSlot>; 0] = [];
        let mut queue = JobQueue::new(&mut slots);
        let answer = Value::from_i30(42).unwrap();
        assert_eq!(
            resolve_native(&mut arena, &mut queue, promise, answer),
            Ok(Resolution::Fulfilled(promise))
        );
        assert_eq!(
            settled_result(&arena, promise),
            Ok(Some((Settlement::Fulfilled, answer)))
        );
    }

    #[test]
    fn adopts_a_pending_native_promise() {
        let mut memory = [0; 160];
        let mut arena = Arena::with_root_capacity(&mut memory, 8);
        let source = pending(&mut arena).unwrap();
        let destination = pending(&mut arena).unwrap();
        let mut slots: [Option<JobSlot>; 1] = [None; 1];
        let mut queue = JobQueue::new(&mut slots);
        assert_eq!(
            resolve_native(&mut arena, &mut queue, destination, source),
            Ok(Resolution::Adopted(destination))
        );
        let answer = Value::from_i30(42).unwrap();
        settle(
            &mut arena,
            &mut queue,
            source,
            Settlement::Fulfilled,
            answer,
        )
        .unwrap();
        let job = queue.pop(&mut arena).unwrap().unwrap();
        assert_eq!(job.callback, Value::UNDEFINED);
        settle(
            &mut arena,
            &mut queue,
            job.destination,
            job.settlement,
            job.argument,
        )
        .unwrap();
        assert_eq!(
            settled_result(&arena, destination),
            Ok(Some((Settlement::Fulfilled, answer)))
        );
    }

    #[test]
    fn self_resolution_rejects_with_a_guest_type_error() {
        let mut memory = [0; 64];
        let mut arena = Arena::new(&mut memory);
        let promise = pending(&mut arena).unwrap();
        let mut slots: [Option<JobSlot>; 0] = [];
        let mut queue = JobQueue::new(&mut slots);
        assert_eq!(
            resolve_native(&mut arena, &mut queue, promise, promise),
            Ok(Resolution::Rejected(promise))
        );
        let Some((Settlement::Rejected, reason)) = settled_result(&arena, promise).unwrap() else {
            panic!("expected rejection")
        };
        assert_eq!(
            microesnext_errors::kind(&arena, reason),
            Ok(microesnext_errors::ErrorKind::Type)
        );
    }
}
