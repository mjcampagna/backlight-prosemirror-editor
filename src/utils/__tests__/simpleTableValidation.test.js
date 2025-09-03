// Simple GFM-compliant table validation tests
import { describe, it, expect } from 'vitest';
import { validateTableStructure, countTableCells, isTableSeparatorRow } from '../patternUtils.js';

describe('Simple Table Validation', () => {
  describe('countTableCells', () => {
    it('should count cells correctly with and without ending pipes', () => {
      expect(countTableCells('| A | B |')).toBe(2);
      expect(countTableCells('| A | B')).toBe(2);
      expect(countTableCells('|A|B|')).toBe(2);
      expect(countTableCells('|A|B')).toBe(2);
      expect(countTableCells('| Single |')).toBe(1);
      expect(countTableCells('| Single')).toBe(1);
    });
  });

  describe('isTableSeparatorRow', () => {
    it('should detect valid separators with and without spaces', () => {
      expect(isTableSeparatorRow('| - |')).toBe(true);
      expect(isTableSeparatorRow('|-')).toBe(true);
      expect(isTableSeparatorRow('| :- |')).toBe(true);
      expect(isTableSeparatorRow('|:-')).toBe(true);
      expect(isTableSeparatorRow('| -: |')).toBe(true);
      expect(isTableSeparatorRow('|-:')).toBe(true);
      expect(isTableSeparatorRow('| :-: |')).toBe(true);
      expect(isTableSeparatorRow('|:-:')).toBe(true);
    });
    
    it('should reject invalid separators', () => {
      expect(isTableSeparatorRow('| Data |')).toBe(false);
      expect(isTableSeparatorRow('|Data')).toBe(false);
      expect(isTableSeparatorRow('Regular text')).toBe(false);
    });
  });

  describe('validateTableStructure', () => {
    it('should validate single lines as valid table content', () => {
      expect(validateTableStructure('| Header')).toEqual({
        isValid: true,
        cssClass: 'pm-table'
      });
      
      expect(validateTableStructure('|-')).toEqual({
        isValid: true,
        cssClass: 'pm-table'
      });
      
      expect(validateTableStructure('| Data | More')).toEqual({
        isValid: true,
        cssClass: 'pm-table'
      });
    });

    it('should validate matching cell counts as valid', () => {
      // 1 cell each
      expect(validateTableStructure('| Header\n|-')).toEqual({
        isValid: true,
        cssClass: 'pm-table'
      });
      
      // 2 cells each
      expect(validateTableStructure('| A | B\n| - | -')).toEqual({
        isValid: true,
        cssClass: 'pm-table'
      });
      
      // With alignment
      expect(validateTableStructure('| Left | Right\n| :- | -:')).toEqual({
        isValid: true,
        cssClass: 'pm-table'
      });
    });

    it('should invalidate mismatched cell counts', () => {
      // 2 header cells vs 1 separator cell
      expect(validateTableStructure('| A | B\n|-')).toEqual({
        isValid: false,
        cssClass: 'pm-table-invalid'
      });
      
      // 1 header cell vs 2 separator cells  
      expect(validateTableStructure('| Header\n| - | -')).toEqual({
        isValid: false,
        cssClass: 'pm-table-invalid'
      });
    });

    it('should handle compact vs spaced formats identically', () => {
      const testPairs = [
        ['| Header\n|:-', '| Header\n| :-'],     // Left align
        ['| Header\n|-:', '| Header\n| -:'],     // Right align
        ['| Header\n|-', '| Header\n| -'],       // Basic
        ['| A | B\n|:-|-:', '| A | B\n| :- | -:'] // Multi-column
      ];
      
      testPairs.forEach(([compact, spaced]) => {
        const compactResult = validateTableStructure(compact);
        const spacedResult = validateTableStructure(spaced);
        
        expect(compactResult).toEqual(spacedResult);
        expect(compactResult.isValid).toBe(true);
        expect(compactResult.cssClass).toBe('pm-table');
      });
    });

    it('should ignore data rows per GFM spec', () => {
      // Data rows can have different cell counts - only header vs separator matters
      const validTable = validateTableStructure(`| A | B
| - | -
| Single`);
      
      expect(validTable.isValid).toBe(true);
      expect(validTable.cssClass).toBe('pm-table');
    });
  });
});
