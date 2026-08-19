// lib/base58.ts — Bitcoin-alphabet base58, used to render Solana ed25519
// signatures the way the Crypto Engine expects them (FSD FR-5).

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

export function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return ""

  // Count leading zero bytes — each becomes a leading "1".
  let zeros = 0
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++

  // Repeated division of the byte string by 58, little-endian digit buffer.
  const digits: number[] = [0]
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i]
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8
      digits[j] = carry % 58
      carry = (carry / 58) | 0
    }
    while (carry > 0) {
      digits.push(carry % 58)
      carry = (carry / 58) | 0
    }
  }

  let out = "1".repeat(zeros)
  for (let i = digits.length - 1; i >= 0; i--) out += ALPHABET[digits[i]]
  return out
}
