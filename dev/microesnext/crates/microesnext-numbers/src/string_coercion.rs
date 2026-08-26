use crate::coercion::PrimitiveNumber;
use microesnext_arena::{Arena, BlockKind};
use microesnext_types::{Error, Value};

/// Apply `ToNumber` through the primitive and string-only compositions.
pub fn coerce(arena: &Arena<'_>, value: Value) -> Result<PrimitiveNumber, Error> {
    match crate::coercion::coerce(arena, value) {
        Ok(number) => return Ok(number),
        Err(Error::Type) => {}
        Err(error) => return Err(error),
    }
    let reference = value.as_ref().ok_or(Error::Type)?;
    if arena.kind(reference)? != BlockKind::String {
        return Err(Error::Type);
    }
    Ok(PrimitiveNumber::F64(parse(arena.bytes(reference)?)))
}

pub fn to_number(arena: &mut Arena<'_>, value: Value) -> Result<Value, Error> {
    match crate::coercion::coerce(arena, value) {
        Ok(number) => {
            if value.as_i30().is_some() || value.as_ref().is_some() {
                return Ok(value);
            }
            return materialize(arena, number);
        }
        Err(Error::Type) => {}
        Err(error) => return Err(error),
    }
    let number = coerce(arena, value)?;
    materialize(arena, number)
}

fn materialize(arena: &mut Arena<'_>, number: PrimitiveNumber) -> Result<Value, Error> {
    match number {
        PrimitiveNumber::I30(number) => Ok(Value::from_i30(number).unwrap()),
        PrimitiveNumber::F64(number) => microesnext_numbers::new(arena, number),
    }
}

/// Parse the ECMAScript StringNumericLiteral grammar without allocating.
pub fn parse(bytes: &[u8]) -> f64 {
    let Ok(source) = core::str::from_utf8(bytes) else {
        return f64::NAN;
    };
    let source = source.trim_matches(is_javascript_whitespace);
    if source.is_empty() {
        return 0.0;
    }
    match source {
        "Infinity" | "+Infinity" => return f64::INFINITY,
        "-Infinity" => return f64::NEG_INFINITY,
        _ => {}
    }
    if let Some((radix, digits)) = non_decimal(source.as_bytes()) {
        return parse_radix_integer(digits, radix);
    }
    if !decimal_grammar(source.as_bytes()) {
        return f64::NAN;
    }
    microesnext_decimal_to_f64::parse(source.as_bytes()).unwrap_or(f64::NAN)
}

fn is_javascript_whitespace(character: char) -> bool {
    matches!(
        character,
        '\u{0009}'
            ..='\u{000d}'
                | '\u{0020}'
                | '\u{00a0}'
                | '\u{1680}'
                | '\u{2000}'..='\u{200a}'
                | '\u{2028}'
                | '\u{2029}'
                | '\u{202f}'
                | '\u{205f}'
                | '\u{3000}'
                | '\u{feff}'
    )
}

fn non_decimal(source: &[u8]) -> Option<(u8, &[u8])> {
    let [b'0', prefix, digits @ ..] = source else {
        return None;
    };
    match prefix {
        b'b' | b'B' => Some((2, digits)),
        b'o' | b'O' => Some((8, digits)),
        b'x' | b'X' => Some((16, digits)),
        _ => None,
    }
}

fn decimal_grammar(source: &[u8]) -> bool {
    let mut index = usize::from(matches!(source.first(), Some(b'+' | b'-')));
    let integer_start = index;
    while source.get(index).is_some_and(u8::is_ascii_digit) {
        index += 1;
    }
    let mut digits = index - integer_start;
    if source.get(index) == Some(&b'.') {
        index += 1;
        let fraction_start = index;
        while source.get(index).is_some_and(u8::is_ascii_digit) {
            index += 1;
        }
        digits += index - fraction_start;
    }
    if digits == 0 {
        return false;
    }
    if matches!(source.get(index), Some(b'e' | b'E')) {
        index += 1;
        if matches!(source.get(index), Some(b'+' | b'-')) {
            index += 1;
        }
        let exponent_start = index;
        while source.get(index).is_some_and(u8::is_ascii_digit) {
            index += 1;
        }
        if index == exponent_start {
            return false;
        }
    }
    index == source.len()
}

fn parse_radix_integer(digits: &[u8], radix: u8) -> f64 {
    let bits_per_digit = radix.trailing_zeros();
    let mut significant_bits = 0_u32;
    let mut leading = 0_u64;
    let mut sticky = false;
    for digit in digits.iter().copied() {
        let Some(digit) = digit_value(digit).filter(|digit| *digit < radix) else {
            return f64::NAN;
        };
        for shift in (0..bits_per_digit).rev() {
            let bit = u64::from((digit >> shift) & 1);
            if significant_bits == 0 && bit == 0 {
                continue;
            }
            significant_bits += 1;
            if significant_bits <= 54 {
                leading = (leading << 1) | bit;
            } else {
                sticky |= bit != 0;
            }
        }
    }
    if digits.is_empty() {
        return f64::NAN;
    }
    if significant_bits == 0 {
        return 0.0;
    }
    if significant_bits <= 53 {
        return leading as f64;
    }
    let mut exponent = significant_bits - 1;
    let guard = leading & 1;
    let mut significand = leading >> 1;
    if guard != 0 && (sticky || significand & 1 != 0) {
        significand += 1;
        if significand == 1 << 53 {
            significand >>= 1;
            exponent += 1;
        }
    }
    if exponent > 1023 {
        return f64::INFINITY;
    }
    let fraction = significand - (1 << 52);
    f64::from_bits((u64::from(exponent + 1023) << 52) | fraction)
}

fn digit_value(byte: u8) -> Option<u8> {
    match byte {
        b'0'..=b'9' => Some(byte - b'0'),
        b'a'..=b'f' => Some(byte - b'a' + 10),
        b'A'..=b'F' => Some(byte - b'A' + 10),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_decimal_infinity_whitespace_and_invalid_input() {
        for (source, expected) in [
            ("", 0.0),
            (" \t\n", 0.0),
            ("\u{feff}42\u{3000}", 42.0),
            ("+.5e2", 50.0),
            ("Infinity", f64::INFINITY),
            ("-Infinity", f64::NEG_INFINITY),
        ] {
            assert_eq!(parse(source.as_bytes()), expected, "{source:?}");
        }
        for source in ["+", ".", "1e", "NaN", "inf", "1_0", "1 2"] {
            assert!(parse(source.as_bytes()).is_nan(), "{source:?}");
        }
        assert!(parse(b"\xff").is_nan());
        assert!(parse(b"-0").is_sign_negative());
    }

    #[test]
    fn parses_power_of_two_radices_with_rounding() {
        assert_eq!(parse(b"0b101010"), 42.0);
        assert_eq!(parse(b"0o52"), 42.0);
        assert_eq!(parse(b"0x2a"), 42.0);
        assert_eq!(parse(b"0x20000000000001"), 9_007_199_254_740_992.0);
        assert_eq!(parse(b"0x20000000000003"), 9_007_199_254_740_996.0);
        assert!(parse(b"0x").is_nan());
        assert!(parse(b"-0x1").is_nan());
        assert!(parse(b"0b2").is_nan());
    }

    #[test]
    fn composes_strings_without_changing_primitive_results() {
        let mut memory = [0; 32];
        let mut arena = Arena::new(&mut memory);
        assert_eq!(coerce(&arena, Value::TRUE), Ok(PrimitiveNumber::I30(1)));
        let string = arena
            .allocate_bytes(BlockKind::String, b" 1.25 ", &mut [])
            .map(Value::from_ref)
            .unwrap();
        assert_eq!(coerce(&arena, string), Ok(PrimitiveNumber::F64(1.25)));
    }
}
