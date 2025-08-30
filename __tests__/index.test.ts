import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Transform } from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';
import Vinyl from 'vinyl';
import inlineStyle from '../src/index';

// Mock fs module
vi.mock('node:fs');
const mockFs = vi.mocked(fs);

describe('gulp-inline-style', () => {
  let mockFile: Vinyl;
  let plugin: Transform;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a mock Vinyl file
    mockFile = new Vinyl({
      path: '/test/file.html',
      contents: Buffer.from('<html><head><link id="main-css" href="styles.css"></head></html>')
    });

    // Mock fs.existsSync to return true by default
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('body { color: red; }');
  });

  describe('plugin creation', () => {
    it('should create a Transform stream', () => {
      plugin = inlineStyle(['main-css']);
      expect(plugin).toBeInstanceOf(Transform);
    });

    it('should throw error for non-array options', () => {
      expect(() => inlineStyle('invalid' as any)).toThrow('Options must be an array of strings');
      expect(() => inlineStyle({} as any)).toThrow('Options must be an array of strings');
      expect(() => inlineStyle(123 as any)).toThrow('Options must be an array of strings');
    });

    it('should accept empty array', () => {
      expect(() => inlineStyle([])).not.toThrow();
    });
  });

  describe('transform function', () => {
    beforeEach(() => {
      plugin = inlineStyle(['main-css']);
    });

    it('should handle null files', async () => {
      const nullFile = new Vinyl({ path: '/test/null.html', contents: null });
      
      return new Promise<void>((resolve) => {
        plugin.write(nullFile);
        plugin.once('data', (file) => {
          expect(file).toBe(nullFile);
          resolve();
        });
      });
    });

    it('should handle stream files with error', async () => {
      const streamFile = new Vinyl({ 
        path: '/test/stream.html', 
        contents: { pipe: vi.fn() } as any 
      });
      
      return new Promise<void>((resolve) => {
        plugin.write(streamFile);
        plugin.once('error', (error) => {
          expect(error.message).toContain('Streaming not supported');
          resolve();
        });
      });
    });

    it('should inline CSS for matching ID', async () => {
      return new Promise<void>((resolve) => {
        plugin.write(mockFile);
        
        plugin.once('data', (file) => {
          const content = file.contents.toString();
          expect(content).toContain('<style>body { color: red; }</style>');
          expect(content).not.toContain('<link id="main-css"');
          resolve();
        });
      });
    });

    it('should preserve media attributes', async () => {
      const fileWithMedia = new Vinyl({
        path: '/test/file.html',
        contents: Buffer.from('<html><head><link id="main-css" href="styles.css" media="print"></head></html>')
      });

      return new Promise<void>((resolve) => {
        plugin.write(fileWithMedia);
        
        plugin.once('data', (file) => {
          const content = file.contents.toString();
          expect(content).toContain('<style media="print">body { color: red; }</style>');
          resolve();
        });
      });
    });

    it('should handle multiple CSS files', async () => {
      const multiFile = new Vinyl({
        path: '/test/file.html',
        contents: Buffer.from(`
          <html><head>
            <link id="main-css" href="main.css">
            <link id="theme-css" href="theme.css">
          </head></html>
        `)
      });

      mockFs.readFileSync
        .mockReturnValueOnce('body { color: red; }')
        .mockReturnValueOnce('body { background: blue; }');

      const multiPlugin = inlineStyle(['main-css', 'theme-css']);
      return new Promise<void>((resolve) => {
        multiPlugin.write(multiFile);
        
        multiPlugin.once('data', (file) => {
          const content = file.contents.toString();
          expect(content).toContain('<style>body { color: red; }</style>');
          expect(content).toContain('<style>body { background: blue; }</style>');
          resolve();
        });
      });
    });

    it('should skip non-matching IDs', async () => {
      const fileWithNonMatching = new Vinyl({
        path: '/test/file.html',
        contents: Buffer.from('<html><head><link id="other-css" href="styles.css"></head></html>')
      });

      return new Promise<void>((resolve) => {
        plugin.write(fileWithNonMatching);
        
        plugin.once('data', (file) => {
          const content = file.contents.toString();
          expect(content).toContain('<link id="other-css" href="styles.css">');
          expect(content).not.toContain('<style>');
          resolve();
        });
      });
    });

    it('should handle missing CSS files gracefully', async () => {
      mockFs.existsSync.mockReturnValue(false);
      
      return new Promise<void>((resolve) => {
        plugin.write(mockFile);
        
        plugin.once('data', (file) => {
          const content = file.contents.toString();
          expect(content).toContain('<link id="main-css" href="styles.css">');
          expect(content).not.toContain('<style>');
          resolve();
        });
      });
    });

    it('should handle file read errors', async () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      return new Promise<void>((resolve) => {
        plugin.write(mockFile);
        
        plugin.once('error', (error) => {
          expect(error.message).toContain('File read error');
          resolve();
        });
      });
    });

    it('should handle complex regex patterns', async () => {
      const complexFile = new Vinyl({
        path: '/test/file.html',
        contents: Buffer.from(`
          <html><head>
            <link id="main-css" href="./styles/main.css" media="screen" rel="stylesheet">
            <link id="theme-css" href="../themes/dark.css" media="(max-width: 768px)">
          </head></html>
        `)
      });

      mockFs.readFileSync
        .mockReturnValueOnce('body { color: red; }')
        .mockReturnValueOnce('body { background: black; }');

      const complexPlugin = inlineStyle(['main-css', 'theme-css']);
      return new Promise<void>((resolve) => {
        complexPlugin.write(complexFile);
        
        complexPlugin.once('data', (file) => {
          const content = file.contents.toString();
          expect(content).toContain('<style media="screen">body { color: red; }</style>');
          expect(content).toContain('<style media="(max-width: 768px)">body { background: black; }</style>');
          resolve();
        });
      });
    });
  });

  describe('edge cases', () => {
    it('should handle files with no link tags', async () => {
      const noLinksFile = new Vinyl({
        path: '/test/file.html',
        contents: Buffer.from('<html><body>No links here</body></html>')
      });

      return new Promise<void>((resolve) => {
        plugin.write(noLinksFile);
        
        plugin.once('data', (file) => {
          const content = file.contents.toString();
          expect(content).toBe('<html><body>No links here</body></html>');
          resolve();
        });
      });
    });

    it('should handle empty CSS content', async () => {
      mockFs.readFileSync.mockReturnValue('');
      
      return new Promise<void>((resolve) => {
        plugin.write(mockFile);
        
        plugin.once('data', (file) => {
          const content = file.contents.toString();
          expect(content).toContain('<style></style>');
          resolve();
        });
      });
    });
  });
});
