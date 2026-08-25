#![no_std]

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, RootId, Value};

const PENDING: i32 = 0;
const FULFILLED: i32 = 1;
const REJECTED: i32 = 2;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Settlement {
    Fulfilled,
    Rejected,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct Job {
    pub callback: Value,
    pub argument: Value,
    pub destination: Value,
    pub settlement: Settlement,
}

#[derive(Clone, Copy)]
pub struct JobSlot {
    callback: RootId,
    argument: RootId,
    destination: RootId,
    settlement: Settlement,
}

/// A FIFO ring supplied by the embedder. Each occupied slot retains its guest
/// values in the arena root table, so compaction cannot stale queued jobs.
pub struct JobQueue<'slots> {
    slots: &'slots mut [Option<JobSlot>],
    head: usize,
    len: usize,
}

impl<'slots> JobQueue<'slots> {
    pub fn new(slots: &'slots mut [Option<JobSlot>]) -> Self {
        slots.fill(None);
        Self {
            slots,
            head: 0,
            len: 0,
        }
    }

    pub fn len(&self) -> usize {
        self.len
    }

    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    pub fn remaining(&self) -> usize {
        self.slots.len() - self.len
    }

    pub fn push(&mut self, arena: &mut Arena<'_>, job: Job) -> Result<(), Error> {
        if self.len == self.slots.len() {
            return Err(Error::OutOfMemory);
        }
        let callback = arena.retain(job.callback)?;
        let argument = match arena.retain(job.argument) {
            Ok(root) => root,
            Err(error) => {
                arena.release(callback)?;
                return Err(error);
            }
        };
        let destination = match arena.retain(job.destination) {
            Ok(root) => root,
            Err(error) => {
                arena.release(argument)?;
                arena.release(callback)?;
                return Err(error);
            }
        };
        let index = (self.head + self.len) % self.slots.len();
        self.slots[index] = Some(JobSlot {
            callback,
            argument,
            destination,
            settlement: job.settlement,
        });
        self.len += 1;
        Ok(())
    }

    pub fn pop(&mut self, arena: &mut Arena<'_>) -> Result<Option<Job>, Error> {
        if self.len == 0 {
            return Ok(None);
        }
        let slot = self.slots[self.head]
            .take()
            .ok_or(Error::DanglingReference)?;
        self.head = (self.head + 1) % self.slots.len();
        self.len -= 1;
        Ok(Some(Job {
            callback: arena.release(slot.callback)?,
            argument: arena.release(slot.argument)?,
            destination: arena.release(slot.destination)?,
            settlement: slot.settlement,
        }))
    }

    fn rollback(&mut self, arena: &mut Arena<'_>, length: usize) -> Result<(), Error> {
        while self.len > length {
            let index = (self.head + self.len - 1) % self.slots.len();
            let slot = self.slots[index].take().ok_or(Error::DanglingReference)?;
            self.len -= 1;
            arena.release(slot.destination)?;
            arena.release(slot.argument)?;
            arena.release(slot.callback)?;
        }
        Ok(())
    }
}

pub fn pending(arena: &mut Arena<'_>) -> Result<Value, Error> {
    let reactions = arena.allocate_values(BlockKind::Reactions, &mut [], &mut [])?;
    let promise = arena.allocate_values(
        BlockKind::Promise,
        &mut [
            state(PENDING)?,
            Value::UNDEFINED,
            Value::from_ref(reactions),
        ],
        &mut [],
    )?;
    Ok(Value::from_ref(promise))
}

pub fn then(
    arena: &mut Arena<'_>,
    queue: &mut JobQueue<'_>,
    promise: Value,
    on_fulfilled: Value,
    on_rejected: Value,
    destination: Value,
) -> Result<Value, Error> {
    let (promise_state, result, reactions) = fields(arena, promise)?;
    if promise_state == PENDING {
        let mut live = [promise, on_fulfilled, on_rejected, destination];
        let (promise_root, reaction) = live.split_at_mut(1);
        let reactions = arena.extend_values(reactions, reaction, promise_root)?;
        let promise_ref = live[0].as_ref().ok_or(Error::Type)?;
        arena.set_value(promise_ref, 2, Value::from_ref(reactions))?;
        return Ok(live[0]);
    }
    let settlement = if promise_state == FULFILLED {
        Settlement::Fulfilled
    } else {
        Settlement::Rejected
    };
    let callback = if settlement == Settlement::Fulfilled {
        on_fulfilled
    } else {
        on_rejected
    };
    queue.push(
        arena,
        Job {
            callback,
            argument: result,
            destination,
            settlement,
        },
    )?;
    Ok(promise)
}

pub fn settle(
    arena: &mut Arena<'_>,
    queue: &mut JobQueue<'_>,
    promise: Value,
    settlement: Settlement,
    result: Value,
) -> Result<Value, Error> {
    let (promise_state, _, reactions) = fields(arena, promise)?;
    if promise_state != PENDING {
        return Ok(promise);
    }
    let entry_len = arena.values(reactions)?.len();
    if entry_len % 3 != 0 || queue.remaining() < entry_len / 3 {
        return Err(Error::OutOfMemory);
    }
    let checkpoint = queue.len();
    for index in 0..entry_len / 3 {
        // Copy one reaction out before queueing it: retaining the job may
        // compact the arena and therefore relocate the reaction block.
        let (on_fulfilled, on_rejected, destination) = {
            let entries = arena.values(reactions)?;
            let offset = index * 3;
            (
                Value::from_raw(entries[offset]),
                Value::from_raw(entries[offset + 1]),
                Value::from_raw(entries[offset + 2]),
            )
        };
        let callback = if settlement == Settlement::Fulfilled {
            on_fulfilled
        } else {
            on_rejected
        };
        if let Err(error) = queue.push(
            arena,
            Job {
                callback,
                argument: result,
                destination,
                settlement,
            },
        ) {
            queue.rollback(arena, checkpoint)?;
            return Err(error);
        }
    }
    let promise_ref = promise.as_ref().ok_or(Error::Type)?;
    arena.set_value(
        promise_ref,
        0,
        state(if settlement == Settlement::Fulfilled {
            FULFILLED
        } else {
            REJECTED
        })?,
    )?;
    arena.set_value(promise_ref, 1, result)?;
    arena.set_value(promise_ref, 2, Value::NULL)?;
    Ok(promise)
}

/// Settle a promise that has not yet escaped to code that can attach a
/// reaction. Async-function entry uses this while its caller is snapshotted.
pub fn settle_unobserved(
    arena: &mut Arena<'_>,
    promise: Value,
    settlement: Settlement,
    result: Value,
) -> Result<Value, Error> {
    let (promise_state, _, reactions) = fields(arena, promise)?;
    if promise_state != PENDING {
        return Ok(promise);
    }
    if !arena.values(reactions)?.is_empty() {
        return Err(Error::Type);
    }
    let mut slots = [];
    let mut queue = JobQueue::new(&mut slots);
    settle(arena, &mut queue, promise, settlement, result)
}

pub fn status(arena: &Arena<'_>, promise: Value) -> Result<Option<Settlement>, Error> {
    Ok(match fields(arena, promise)?.0 {
        PENDING => None,
        FULFILLED => Some(Settlement::Fulfilled),
        REJECTED => Some(Settlement::Rejected),
        _ => return Err(Error::DanglingReference),
    })
}

pub fn is_promise(arena: &Arena<'_>, value: Value) -> bool {
    value
        .as_ref()
        .and_then(|reference| arena.kind(reference).ok())
        == Some(BlockKind::Promise)
}

pub fn settled_result(
    arena: &Arena<'_>,
    promise: Value,
) -> Result<Option<(Settlement, Value)>, Error> {
    let (promise_state, result, _) = fields(arena, promise)?;
    Ok(match promise_state {
        PENDING => None,
        FULFILLED => Some((Settlement::Fulfilled, result)),
        REJECTED => Some((Settlement::Rejected, result)),
        _ => return Err(Error::DanglingReference),
    })
}

fn fields(
    arena: &Arena<'_>,
    promise: Value,
) -> Result<(i32, Value, microesnext_types::HeapRef), Error> {
    let promise = promise.as_ref().ok_or(Error::Type)?;
    if arena.kind(promise)? != BlockKind::Promise {
        return Err(Error::Type);
    }
    let fields = arena.values(promise)?;
    if fields.len() != 3 {
        return Err(Error::DanglingReference);
    }
    let state = Value::from_raw(fields[0]).as_i30().ok_or(Error::Type)?;
    let result = Value::from_raw(fields[1]);
    let reactions = Value::from_raw(fields[2]);
    if state == PENDING {
        Ok((
            state,
            result,
            reactions.as_ref().ok_or(Error::DanglingReference)?,
        ))
    } else {
        // Settled promises clear their reaction list. The reference is unused.
        Ok((state, result, promise))
    }
}

fn state(value: i32) -> Result<Value, Error> {
    Value::from_i30(value).ok_or(Error::Type)
}

#[cfg(test)]
mod tests {
    use microesnext_objects::new_object;

    use super::*;

    #[test]
    fn an_unobserved_promise_settles_without_a_job_queue() {
        let mut memory = [0; 48];
        let mut arena = Arena::new(&mut memory);
        let promise = pending(&mut arena).unwrap();
        let answer = Value::from_i30(42).unwrap();
        settle_unobserved(&mut arena, promise, Settlement::Fulfilled, answer).unwrap();
        assert_eq!(
            settled_result(&arena, promise),
            Ok(Some((Settlement::Fulfilled, answer)))
        );
    }

    #[test]
    fn reactions_are_fifo_and_choose_the_settlement_handler() {
        let mut memory = [0; 192];
        let mut arena = Arena::with_root_capacity(&mut memory, 16);
        let mut slots = [None; 4];
        let mut queue = JobQueue::new(&mut slots);
        let promise = pending(&mut arena).unwrap();
        let destination = pending(&mut arena).unwrap();
        let promise = then(
            &mut arena,
            &mut queue,
            promise,
            Value::TRUE,
            Value::FALSE,
            destination,
        )
        .unwrap();
        settle(
            &mut arena,
            &mut queue,
            promise,
            Settlement::Rejected,
            Value::from_i30(7).unwrap(),
        )
        .unwrap();
        let job = queue.pop(&mut arena).unwrap().unwrap();
        assert_eq!(job.callback, Value::FALSE);
        assert_eq!(job.argument.as_i30(), Some(7));
        assert_eq!(job.destination, destination);
        assert!(queue.is_empty());
    }

    #[test]
    fn queued_values_remain_rooted_during_compaction() {
        let mut memory = [0; 192];
        let mut arena = Arena::with_root_capacity(&mut memory, 16);
        let mut slots = [None; 2];
        let mut queue = JobQueue::new(&mut slots);
        let promise = pending(&mut arena).unwrap();
        let destination = pending(&mut arena).unwrap();
        let argument = new_object(&mut arena, Value::NULL).unwrap();
        let promise = then(
            &mut arena,
            &mut queue,
            promise,
            Value::TRUE,
            Value::FALSE,
            destination,
        )
        .unwrap();
        settle(
            &mut arena,
            &mut queue,
            promise,
            Settlement::Fulfilled,
            argument,
        )
        .unwrap();

        arena.compact(&mut []).unwrap();

        let job = queue.pop(&mut arena).unwrap().unwrap();
        assert_eq!(
            arena.kind(job.argument.as_ref().unwrap()).unwrap(),
            BlockKind::Object
        );
    }
}
