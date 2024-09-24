import { describe, it } from 'vitest';
import assert from 'node:assert';
import { StringReplacer } from '../src';

describe('Exact match replacement', () => {
  it('should replace exact match in the string', () => {
    const result = new StringReplacer('Hello World').replace('World', 'Vitest').toString();
    assert.strictEqual(result, 'Hello Vitest');
  });

  it('should replace part of a sentence using an exact match', () => {
    const result = new StringReplacer('This is a simple test.')
      .replace('simple', 'complex')
      .toString();
    assert.strictEqual(result, 'This is a complex test.');
  });

  it('should not replace if target is not found', () => {
    const result = new StringReplacer('Hello World').replace('Universe', 'Vitest').toString();
    assert.strictEqual(result, 'Hello World');
  });

  it('should replace target with an empty string', () => {
    const result = new StringReplacer('Remove this part.')
      .replace('this part', '')
      .toString();
    assert.strictEqual(result, 'Remove .');
  });
});

describe('Delimiter-based replacement', () => {
  it('should replace using delimiters', () => {
    const result = new StringReplacer('Hello {name}, welcome!')
      .replace(['{', '}'], 'John Doe')
      .toString();
    assert.strictEqual(result, 'Hello John Doe, welcome!');
  });

  it('should replace all occurrences using delimiters', () => {
    const result = new StringReplacer('Hello {name}, welcome {name}!')
      .replaceAll(['{', '}'], 'John Doe')
      .toString();
    assert.strictEqual(result, 'Hello John Doe, welcome John Doe!');
  });

  it('should replace using special character delimiters', () => {
    const result = new StringReplacer('Hello (name), welcome!')
      .replace(['(', ')'], 'John Doe')
      .toString();
    assert.strictEqual(result, 'Hello John Doe, welcome!');
  });

  it('should replace inside multiline string using delimiters', () => {
    const result = new StringReplacer('Hello {name},\nWelcome to {place}.')
      .replaceAll(['{', '}'], 'Multiverse')
      .toString();
    assert.strictEqual(result, 'Hello Multiverse,\nWelcome to Multiverse.');
  });
});

describe('Multiple occurrences replacement', () => {
  it('should replace all occurrences of exact match', () => {
    const result = new StringReplacer('Hello World! Hello World!')
      .replaceAll('World', 'Vitest')
      .toString();
    assert.strictEqual(result, 'Hello Vitest! Hello Vitest!');
  });
});

describe('Escaping special characters', () => {
  it('should escape special characters when using exact match', () => {
    const result = new StringReplacer('Hello [World]').replace('[World]', 'Vitest').toString();
    assert.strictEqual(result, 'Hello Vitest');
  });
});

describe('Chaining replacements', () => {
  it('should chain multiple replacements', () => {
    const result = new StringReplacer('Hello World!')
      .replace('World', 'Vitest')
      .replace('Hello', 'Hi')
      .toString();
    assert.strictEqual(result, 'Hi Vitest!');
  });

  it('should chain multiple replacements using delimiters', () => {
    const result = new StringReplacer('Hello {name}, welcome {name}!')
      .replace(['{', '}'], 'John Doe')
      .replace('Hello', 'Hi')
      .toString();
    assert.strictEqual(result, 'Hi John Doe, welcome John Doe!');
  });
});

describe('Multilines in replace', () => {
  it('should replace multiline string using exact match', () => {
    const result = new StringReplacer('Hello\nWorld!').replace('Hello\nWorld!', 'Vitest').toString();
    assert.strictEqual(result, 'Vitest');
  });

  it('should replace multiline string using delimiters', () => {
    const result = new StringReplacer('Hello\n{name}!').replace(['Hello\n', '!'], 'Vitest').toString();
    assert.strictEqual(result, 'Vitest');
  });

  it('should replace multiline string using delimiters with multiple occurrences', () => {
    const result = new StringReplacer('Hello\n{name}!\nHello\n{name}!').replaceAll(['Hello\n', '!'], 'Vitest').toString();
    assert.strictEqual(result, 'Vitest\nVitest');
  });
});
