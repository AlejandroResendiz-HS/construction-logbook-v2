import { expect, test } from 'vitest'
import { createOpaqueToken, hashOpaqueToken, tokenHashesMatch } from '@/lib/security'

test('opaque tokens are random and verifiable without storing plaintext', () => {
  const first = createOpaqueToken()
  const second = createOpaqueToken()

  expect(first).not.toBe(second)

  const hash = hashOpaqueToken(first)
  expect(tokenHashesMatch(first, hash)).toBe(true)
  expect(tokenHashesMatch(second, hash)).toBe(false)
})
