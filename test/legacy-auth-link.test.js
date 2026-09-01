import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeLegacyConsoleHtml } from '../middleware.js';

test('authenticated Console HTML never links Account to legacy Auth', () => {
  const input = '<div><a href="https://auth.relnets.com/access">Cuenta</a></div>';
  const output = sanitizeLegacyConsoleHtml(input);
  assert.doesNotMatch(output, /https:\/\/auth\.relnets\.com\/access/);
  assert.match(output, /href="\/dashboard\/access">Cuenta<\/a>/);
});
