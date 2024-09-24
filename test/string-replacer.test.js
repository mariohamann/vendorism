import { test } from 'vitest';
import assert from 'node:assert';
import { StringReplacer } from '../src'

test('should replace exact match in the string', () => {
  const result = new StringReplacer('Hello World').replace('World', 'Vitest').toString();
  assert.strictEqual(result, 'Hello Vitest');
});

test('should replace using delimiters', () => {
  const result = new StringReplacer('Hello {name}, welcome!')
    .replace(['{', '}'], 'John Doe')
    .toString();
  assert.strictEqual(result, 'Hello John Doe, welcome!');
});

test('should replace all occurrences of exact match', () => {
  const result = new StringReplacer('Hello World! Hello World!')
    .replaceAll('World', 'Vitest')
    .toString();
  assert.strictEqual(result, 'Hello Vitest! Hello Vitest!');
});

test('should replace all occurrences using delimiters', () => {
  const result = new StringReplacer('Hello {name}, welcome {name}!')
    .replaceAll(['{', '}'], 'John Doe')
    .toString();
  assert.strictEqual(result, 'Hello John Doe, welcome John Doe!');
});

test('should not replace if target is not found', () => {
  const result = new StringReplacer('Hello World').replace('Universe', 'Vitest').toString();
  assert.strictEqual(result, 'Hello World');
});

test('should escape special characters when using exact match', () => {
  const result = new StringReplacer('Hello [World]').replace('[World]', 'Vitest').toString();
  assert.strictEqual(result, 'Hello Vitest');
});

test('should replace using special character delimiters', () => {
  const result = new StringReplacer('Hello (name), welcome!')
    .replace(['(', ')'], 'John Doe')
    .toString();
  assert.strictEqual(result, 'Hello John Doe, welcome!');
});

test('should replace inside multiline string using delimiters', () => {
  const result = new StringReplacer('Hello {name},\nWelcome to {place}.')
    .replaceAll(['{', '}'], 'Multiverse')
    .toString();
  assert.strictEqual(result, 'Hello Multiverse,\nWelcome to Multiverse.');
});

test('should replace part of a sentence using an exact match', () => {
  const result = new StringReplacer('This is a simple test.')
    .replace('simple', 'complex')
    .toString();
  assert.strictEqual(result, 'This is a complex test.');
});

test('should replace target with an empty string', () => {
  const result = new StringReplacer('Remove this part.')
    .replace('this part', '')
    .toString();
  assert.strictEqual(result, 'Remove .');
});
