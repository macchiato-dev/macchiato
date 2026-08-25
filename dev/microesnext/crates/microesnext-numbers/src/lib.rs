#![no_std]

use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};

pub fn new(arena: &mut Arena<'_>, number: f64) -> Result<Value, Error> {
    if !(number == 0.0 && number.is_sign_negative()) {
        let integer = number as i32;
        if integer as f64 == number {
            if let Some(value) = Value::from_i30(integer) {
                return Ok(value);
            }
        }
    }
    let bits = number.to_bits();
    let reference = arena.allocate_opaque(
        BlockKind::Number,
        &[bits as u32, (bits >> 32) as u32],
        &mut [],
    )?;
    Ok(Value::from_ref(reference))
}

pub fn get(arena: &Arena<'_>, value: Value) -> Result<f64, Error> {
    if let Some(integer) = value.as_i30() {
        return Ok(integer as f64);
    }
    let reference = value.as_ref().ok_or(Error::Type)?;
    if arena.kind(reference)? != BlockKind::Number {
        return Err(Error::Type);
    }
    let [low, high] = arena.opaque_words(reference)? else {
        return Err(Error::DanglingReference);
    };
    Ok(f64::from_bits(*low as u64 | (*high as u64) << 32))
}

pub fn add(arena: &mut Arena<'_>, left: Value, right: Value) -> Result<Value, Error> {
    let result = get(arena, left)? + get(arena, right)?;
    new(arena, result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_small_integers_immediate_and_boxes_other_numbers() {
        let mut memory = [0; 24];
        let mut arena = Arena::new(&mut memory);
        assert_eq!(new(&mut arena, 42.0).unwrap().as_i30(), Some(42));
        let fraction = new(&mut arena, 1.25).unwrap();
        assert_eq!(get(&arena, fraction).unwrap(), 1.25);
        let negative_zero = new(&mut arena, -0.0).unwrap();
        assert!(get(&arena, negative_zero).unwrap().is_sign_negative());
        let infinity = new(&mut arena, f64::INFINITY).unwrap();
        assert_eq!(get(&arena, infinity).unwrap(), f64::INFINITY);
        let nan = new(&mut arena, f64::from_bits(0x7ff8_0000_0000_0042)).unwrap();
        assert_eq!(get(&arena, nan).unwrap().to_bits(), 0x7ff8_0000_0000_0042);
    }

    #[test]
    fn numeric_bits_are_not_traced_as_references() {
        let mut memory = [0; 24];
        let mut arena = Arena::new(&mut memory);
        let mut number = [new(&mut arena, f64::from_bits(4 << 2)).unwrap()];
        arena.compact(&mut number).unwrap();
        assert_eq!(get(&arena, number[0]).unwrap().to_bits(), 4 << 2);
    }
}
