import { describe, it, expect, vi, beforeEach } from 'vitest';
import { objectsToCsv, exportToCsv, exportToTsv, downloadCsv } from '@/lib/utils/exportCsv';

// Mock the browser APIs used in the module
let mockLink: { setAttribute: ReturnType<typeof vi.fn>; click: ReturnType<typeof vi.fn>; style: { visibility: string } };
let mockBody: { appendChild: ReturnType<typeof vi.fn>; removeChild: ReturnType<typeof vi.fn> };
let mockClick = vi.fn();
let mockAppendChild = vi.fn();
let mockRemove = vi.fn();
let mockRevokeObjectURL = vi.fn();
let mockCreateObjectURL = vi.fn(() => 'blob:test-url');

beforeEach(() => {
  vi.clearAllMocks();
  mockClick = vi.fn();
  mockAppendChild = vi.fn();
  mockRemove = vi.fn();
  mockRevokeObjectURL = vi.fn();
  mockCreateObjectURL = vi.fn(() => 'blob:test-url');
  
  mockLink = {
    setAttribute: vi.fn(),
    click: mockClick,
    style: { visibility: '' },
  };

  mockBody = {
    appendChild: mockAppendChild,
    removeChild: mockRemove,
  };

  vi.stubGlobal('document', {
    createElement: vi.fn(() => mockLink),
    body: mockBody,
  });

  vi.stubGlobal('URL', {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  });
});

describe('exportCsv utils', () => {
  describe('objectsToCsv', () => {
    it('should convert simple array of objects to CSV', () => {
      const data = [
        { id: '1', name: 'Test', value: 100 },
        { id: '2', name: 'Foo', value: 200 },
      ];
      
      const result = objectsToCsv(data);
      
      expect(result).toBe('id,name,value\n1,Test,100\n2,Foo,200');
    });

    it('should handle custom column ordering', () => {
      const data = [
        { id: '1', name: 'Test', value: 100 },
      ];
      
      const result = objectsToCsv(data, { columns: ['name', 'id'] });
      
      expect(result).toBe('name,id\nTest,1');
    });

    it('should handle custom column labels', () => {
      const data = [
        { id: '1', name: 'Test' },
      ];
      
      const result = objectsToCsv(data, {
        columnLabels: { id: 'ID', name: 'Name' }
      });
      
      expect(result).toBe('ID,Name\n1,Test');
    });

    it('should escape fields containing commas', () => {
      const data = [
        { name: 'Hello, World', value: 1 },
      ];
      
      const result = objectsToCsv(data);
      
      expect(result).toBe('name,value\n"Hello, World",1');
    });

    it('should escape fields containing quotes', () => {
      const data = [
        { name: 'Say "Hello"', value: 1 },
      ];
      
      const result = objectsToCsv(data);
      
      expect(result).toBe('name,value\n"Say ""Hello""",1');
    });

    it('should handle fields with newlines', () => {
      const data = [
        { name: 'Line1\nLine2', value: 1 },
      ];
      
      const result = objectsToCsv(data);
      
      expect(result).toBe('name,value\n"Line1\nLine2",1');
    });

    it('should handle null and undefined values', () => {
      const data = [
        { name: null, value: undefined as unknown as number },
      ];
      
      const result = objectsToCsv(data);
      
      expect(result).toBe('name,value\n,');
    });

    it('should return empty string for empty array', () => {
      const result = objectsToCsv([]);
      expect(result).toBe('');
    });

    it('should use custom delimiter for TSV', () => {
      const data = [
        { id: '1', name: 'Test' },
      ];
      
      const result = objectsToCsv(data, { delimiter: '\t' });
      
      expect(result).toBe('id\tname\n1\tTest');
    });
  });

  describe('downloadCsv', () => {
    it('should create download link and trigger click', () => {
      downloadCsv('test,data\n1,2', 'test.csv');
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemove).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    it('should add .csv extension if missing', () => {
      downloadCsv('test', 'export');
      
      const link = (document.createElement as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(link.setAttribute).toHaveBeenCalledWith('download', 'export.csv');
    });
  });

  describe('exportToCsv', () => {
    it('should warn and not download for empty data', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      exportToCsv([]);
      
      expect(warnSpy).toHaveBeenCalledWith('No data to export');
      expect(document.createElement).not.toHaveBeenCalled();
      
      warnSpy.mockRestore();
    });
  });

  describe('exportToTsv', () => {
    it('should create TSV download with .tsv extension', () => {
      exportToTsv([{ id: '1', name: 'Test' }], { filename: 'export' });
      
      const link = (document.createElement as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(link.setAttribute).toHaveBeenCalledWith('download', 'export.tsv');
    });
  });
});
