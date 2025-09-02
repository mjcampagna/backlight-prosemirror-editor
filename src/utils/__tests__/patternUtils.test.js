// Pattern utilities tests
import { describe, it, expect } from 'vitest';
import { createSafeRegexTester, TABLE_ROW_PATTERN, isTableRowText, getUnescapeRegex } from '../patternUtils.js';

describe('Pattern Utilities', () => {
  describe('createSafeRegexTester', () => {
    it('should create a safe regex tester', () => {
      const pattern = /test/g;
      const safeTester = createSafeRegexTester(pattern);
      
      expect(typeof safeTester).toBe('function');
    });

    it('should handle stateful regex without lastIndex issues', () => {
      const globalRegex = /test/g;
      const safeTester = createSafeRegexTester(globalRegex);
      
      // Multiple calls should all work correctly
      expect(safeTester('test content')).toBe(true);
      expect(safeTester('test content')).toBe(true);  // Should not fail due to lastIndex
      expect(safeTester('no match')).toBe(false);
      expect(safeTester('test content')).toBe(true);  // Should still work
    });

    it('should preserve original regex behavior', () => {
      const pattern = /^\|.*\|$/;
      const safeTester = createSafeRegexTester(pattern);
      
      expect(safeTester('| table row |')).toBe(true);
      expect(safeTester('not a table')).toBe(false);
      expect(safeTester('| missing end')).toBe(false);
      expect(safeTester('missing start |')).toBe(false);
    });
  });

  describe('TABLE_ROW_PATTERN', () => {
    it('should be defined and work correctly', () => {
      expect(TABLE_ROW_PATTERN).toBeDefined();
      expect(TABLE_ROW_PATTERN.test('| table row |')).toBe(true);
      expect(TABLE_ROW_PATTERN.test('| with spaces |   ')).toBe(true);
      expect(TABLE_ROW_PATTERN.test('not a table')).toBe(false);
    });
  });

  describe('isTableRowText', () => {
    it('should detect table row patterns correctly', () => {
      expect(isTableRowText('| Header |')).toBe(true);
      expect(isTableRowText('| Data | More |')).toBe(true);
      expect(isTableRowText('| With trailing |   ')).toBe(true);
      expect(isTableRowText('|Compact|')).toBe(true);
      
      expect(isTableRowText('Regular text')).toBe(false);
      expect(isTableRowText('| Missing end')).toBe(false);
      expect(isTableRowText('Missing start |')).toBe(false);
    });

    it('should be safe from regex state mutations', () => {
      // Call multiple times to ensure no lastIndex issues
      expect(isTableRowText('| test |')).toBe(true);
      expect(isTableRowText('| test |')).toBe(true);
      expect(isTableRowText('no match')).toBe(false);
      expect(isTableRowText('| test |')).toBe(true);
    });
  });

  describe('getUnescapeRegex', () => {
    it('should create and cache regex for unescaping characters', () => {
      const pipeRegex = getUnescapeRegex('|');
      const asteriskRegex = getUnescapeRegex('*');
      
      expect(pipeRegex).toBeDefined();
      expect(asteriskRegex).toBeDefined();
      
      // Should return same instance when called again (cached)
      expect(getUnescapeRegex('|')).toBe(pipeRegex);
      expect(getUnescapeRegex('*')).toBe(asteriskRegex);
    });

    it('should create working unescape regexes', () => {
      const pipeRegex = getUnescapeRegex('|');
      const result = '\\| escaped pipe'.replace(pipeRegex, '|');
      expect(result).toBe('| escaped pipe');
    });

    it('should handle special regex characters safely', () => {
      const specialChars = ['|', '*', '_', '+', '?', '^', '$', '(', ')', '[', ']'];
      
      for (const char of specialChars) {
        const regex = getUnescapeRegex(char);
        const testString = `\\${char} escaped`;
        const result = testString.replace(regex, char);
        expect(result).toBe(`${char} escaped`);
      }
    });
  });
});
