import assert from 'node:assert/strict'
import test from 'node:test'
import { createOpaqueToken, hashOpaqueToken, tokenHashesMatch } from '../lib/security'

test('opaque tokens are random and verifiable without storing plaintext', () => {
  const first = createOpaqueToken(); const second = createOpaqueToken()
  assert.notEqual(first, second)
  const hash = hashOpaqueToken(first)
  assert.equal(tokenHashesMatch(first, hash), true)
  assert.equal(tokenHashesMatch(second, hash), false)
})
