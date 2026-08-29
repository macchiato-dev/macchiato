const ROUND: [u64; 24] = [
    0x0000000000000001,
    0x0000000000008082,
    0x800000000000808a,
    0x8000000080008000,
    0x000000000000808b,
    0x0000000080000001,
    0x8000000080008081,
    0x8000000000008009,
    0x000000000000008a,
    0x0000000000000088,
    0x0000000080008009,
    0x000000008000000a,
    0x000000008000808b,
    0x800000000000008b,
    0x8000000000008089,
    0x8000000000008003,
    0x8000000000008002,
    0x8000000000000080,
    0x000000000000800a,
    0x800000008000000a,
    0x8000000080008081,
    0x8000000000008080,
    0x0000000080000001,
    0x8000000080008008,
];
const ROTATION: [u32; 24] = [
    1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 2, 14, 27, 41, 56, 8, 25, 43, 62, 18, 39, 61, 20, 44,
];
const PILN: [usize; 24] = [
    10, 7, 11, 17, 18, 3, 5, 16, 8, 21, 24, 4, 15, 23, 19, 13, 12, 2, 20, 14, 22, 9, 6, 1,
];

fn permutation(state: &mut [u64; 25]) {
    for &round in &ROUND {
        let mut column = [0; 5];
        for x in 0..5 {
            column[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
        }
        for x in 0..5 {
            let delta = column[(x + 4) % 5] ^ column[(x + 1) % 5].rotate_left(1);
            for y in (0..25).step_by(5) {
                state[y + x] ^= delta;
            }
        }
        let mut current = state[1];
        for index in 0..24 {
            let at = PILN[index];
            let next = state[at];
            state[at] = current.rotate_left(ROTATION[index]);
            current = next;
        }
        for y in (0..25).step_by(5) {
            let row = [
                state[y],
                state[y + 1],
                state[y + 2],
                state[y + 3],
                state[y + 4],
            ];
            for x in 0..5 {
                state[y + x] = row[x] ^ (!row[(x + 1) % 5] & row[(x + 2) % 5]);
            }
        }
        state[0] ^= round;
    }
}

/// Legacy Keccak-256 used by Ethereum, not standardized SHA3-256.
pub fn keccak256(input: &[u8]) -> [u8; 32] {
    const RATE: usize = 136;
    let mut state = [0u64; 25];
    let (chunks, remainder) = input.as_chunks::<RATE>();
    for chunk in chunks {
        for (index, bytes) in chunk.as_chunks::<8>().0.iter().enumerate() {
            state[index] ^= u64::from_le_bytes(*bytes);
        }
        permutation(&mut state);
    }
    let mut block = [0u8; RATE];
    block[..remainder.len()].copy_from_slice(remainder);
    block[remainder.len()] = 0x01;
    block[RATE - 1] |= 0x80;
    for (index, bytes) in block.as_chunks::<8>().0.iter().enumerate() {
        state[index] ^= u64::from_le_bytes(*bytes);
    }
    permutation(&mut state);
    let mut output = [0; 32];
    for (index, limb) in state[..4].iter().enumerate() {
        output[index * 8..index * 8 + 8].copy_from_slice(&limb.to_le_bytes());
    }
    output
}

#[cfg(test)]
mod tests {
    use super::keccak256;

    #[test]
    fn hashes_empty_input() {
        assert_eq!(
            keccak256(&[]),
            [
                0xc5, 0xd2, 0x46, 0x01, 0x86, 0xf7, 0x23, 0x3c, 0x92, 0x7e, 0x7d, 0xb2, 0xdc, 0xc7,
                0x03, 0xc0, 0xe5, 0x00, 0xb6, 0x53, 0xca, 0x82, 0x27, 0x3b, 0x7b, 0xfa, 0xd8, 0x04,
                0x5d, 0x85, 0xa4, 0x70,
            ]
        );
    }
}
