// Tests for GFM Tagfilter extension
import { describe, it, expect } from 'vitest';
import { createMarkdownSystem } from '../markdownSystem.js';
import { tagfilterExtension, DISALLOWED_TAGS, filterDisallowedTags, createTagfilterTextProcessingPlugin } from '../extensions/tagfilter.js';

describe('GFM Tagfilter Extension', () => {
  describe('filterDisallowedTags utility', () => {
    it('should filter basic disallowed tags', () => {
      expect(filterDisallowedTags('<script>alert("xss")</script>'))
        .toBe('&lt;script>alert("xss")</script>');
      
      expect(filterDisallowedTags('<iframe src="evil.com"></iframe>'))
        .toBe('&lt;iframe src="evil.com"></iframe>');
        
      expect(filterDisallowedTags('<style>body { display: none; }</style>'))
        .toBe('&lt;style>body { display: none; }</style>');
    });

    it('should handle case insensitive tag matching', () => {
      expect(filterDisallowedTags('<SCRIPT>alert("xss")</SCRIPT>'))
        .toBe('&lt;SCRIPT>alert("xss")</SCRIPT>');
        
      expect(filterDisallowedTags('<Script>alert("xss")</Script>'))
        .toBe('&lt;Script>alert("xss")</Script>');
        
      expect(filterDisallowedTags('<sCrIpT>alert("xss")</sCrIpT>'))
        .toBe('&lt;sCrIpT>alert("xss")</sCrIpT>');
    });

    it('should filter self-closing tags', () => {
      expect(filterDisallowedTags('<script/>'))
        .toBe('&lt;script/>');
        
      expect(filterDisallowedTags('<iframe src="evil.com"/>'))
        .toBe('&lt;iframe src="evil.com"/>');
    });

    it('should filter tags with attributes', () => {
      expect(filterDisallowedTags('<script type="text/javascript">'))
        .toBe('&lt;script type="text/javascript">');
        
      expect(filterDisallowedTags('<iframe src="evil.com" width="100%" height="400">'))
        .toBe('&lt;iframe src="evil.com" width="100%" height="400">');
    });

    it('should filter all disallowed tags', () => {
      const testCases = DISALLOWED_TAGS.map(tag => `<${tag}>content</${tag}>`);
      const expected = DISALLOWED_TAGS.map(tag => `&lt;${tag}>content</${tag}>`);
      
      testCases.forEach((testCase, index) => {
        expect(filterDisallowedTags(testCase)).toBe(expected[index]);
      });
    });

    it('should not filter allowed HTML tags', () => {
      const allowedTags = [
        '<div>content</div>',
        '<p>paragraph</p>', 
        '<span>text</span>',
        '<a href="link">link</a>',
        '<em>emphasis</em>',
        '<strong>bold</strong>',
        '<code>code</code>',
        '<pre>preformatted</pre>'
      ];
      
      allowedTags.forEach(tag => {
        expect(filterDisallowedTags(tag)).toBe(tag);
      });
    });

    it('should handle mixed content', () => {
      const mixed = '<div>Safe content</div><script>evil()</script><p>More safe content</p>';
      const expected = '<div>Safe content</div>&lt;script>evil()</script><p>More safe content</p>';
      expect(filterDisallowedTags(mixed)).toBe(expected);
    });

    it('should handle multiple instances of the same tag', () => {
      const multiple = '<script>first()</script><div>safe</div><script>second()</script>';
      const expected = '&lt;script>first()</script><div>safe</div>&lt;script>second()</script>';
      expect(filterDisallowedTags(multiple)).toBe(expected);
    });
  });

  describe('tagfilter extension integration', () => {
    let markdownSystem;

    beforeEach(() => {
      markdownSystem = createMarkdownSystem([tagfilterExtension], {
        textProcessing: createTagfilterTextProcessingPlugin()
      });
    });

    it('should filter disallowed tags in markdown parsing', () => {
      const markdown = `# Test

<script>alert("xss")</script>

<div>This is safe</div>

<iframe src="evil.com"></iframe>

Regular **markdown** still works.`;

      const doc = markdownSystem.mdParser.parse(markdown);
      const serialized = markdownSystem.mdSerializer.serialize(doc);
      
      // Script and iframe tags should be filtered
      expect(serialized).toContain('&lt;script>alert("xss")</script>');
      expect(serialized).toContain('&lt;iframe src="evil.com"></iframe>');
      
      // Safe HTML and markdown should remain
      expect(serialized).toContain('<div>This is safe</div>');
      expect(serialized).toContain('**markdown**');
    });

    it('should handle inline disallowed HTML', () => {
      const markdown = 'Text with <script>inline.evil()</script> and more text.';
      
      const doc = markdownSystem.mdParser.parse(markdown);
      const serialized = markdownSystem.mdSerializer.serialize(doc);
      
      expect(serialized).toContain('&lt;script>inline.evil()</script>');
    });

    it('should preserve markdown structure with filtered tags', () => {
      const markdown = `## Heading

- List item 1
- <style>evil css</style>
- List item 3

> Quote with <script>evil()</script> content

| Table | With <iframe src="x"></iframe> |
|-------|--------------------------------|
| Row   | Content                        |`;

      const doc = markdownSystem.mdParser.parse(markdown);
      const serialized = markdownSystem.mdSerializer.serialize(doc);
      
      // Structure should be preserved
      expect(serialized).toContain('## Heading');
      expect(serialized).toContain('List item 1'); // Accept either - or * for list markers
      expect(serialized).toContain('> Quote with');
      expect(serialized).toContain('| Table |');
      
      // Dangerous tags should be filtered
      expect(serialized).toContain('&lt;style>evil css</style>');
      expect(serialized).toContain('&lt;script>evil()</script>');
      expect(serialized).toContain('&lt;iframe src="x"></iframe>');
    });
  });

  describe('GFM spec compliance', () => {
    it('should match GFM disallowed tags list', () => {
      const expectedTags = [
        'title', 'textarea', 'style', 'xmp', 'iframe', 
        'noembed', 'noframes', 'script', 'plaintext'
      ];
      
      expect(DISALLOWED_TAGS).toEqual(expectedTags);
    });

    it('should only filter opening tags as per GFM spec', () => {
      // Only opening tags should be filtered, closing tags remain unchanged
      const input = '<script>code</script>';
      const expected = '&lt;script>code</script>';
      expect(filterDisallowedTags(input)).toBe(expected);
    });
  });
});
