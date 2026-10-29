import { test, expect, mock, describe, beforeEach, afterEach } from 'bun:test';
import { downloadCSV } from './bengali';

describe('downloadCSV', () => {
  let originalURL: any;
  let originalDocument: any;
  let originalBlob: any;
  let createElementMock: ReturnType<typeof mock>;
  let appendChildMock: ReturnType<typeof mock>;
  let removeChildMock: ReturnType<typeof mock>;
  let clickMock: ReturnType<typeof mock>;
  let setAttributeMock: ReturnType<typeof mock>;
  let createObjectURLMock: ReturnType<typeof mock>;
  let revokeObjectURLMock: ReturnType<typeof mock>;

  beforeEach(() => {
    originalURL = global.URL;
    originalDocument = global.document;
    originalBlob = global.Blob;

    clickMock = mock(() => {});
    setAttributeMock = mock(() => {});
    createElementMock = mock((tag: string) => {
      if (tag === 'a') {
        return {
          setAttribute: setAttributeMock,
          click: clickMock,
        };
      }
      return {};
    });
    appendChildMock = mock(() => {});
    removeChildMock = mock(() => {});

    global.document = {
      createElement: createElementMock,
      body: {
        appendChild: appendChildMock,
        removeChild: removeChildMock,
      },
    } as any;

    createObjectURLMock = mock(() => 'mock-url');
    revokeObjectURLMock = mock(() => {});

    global.URL = {
      ...originalURL,
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    } as any;
  });

  afterEach(() => {
    global.URL = originalURL;
    global.document = originalDocument;
    global.Blob = originalBlob;
  });

  test('should generate correct CSV and trigger download', () => {
    let capturedBlobArgs: any[] = [];
    global.Blob = mock((...args: any[]) => {
      capturedBlobArgs = args;
      return { type: 'text/csv;charset=utf-8;' };
    }) as any;

    const headers = ['Name', 'Age'];
    const rows = [['John', 30], ['Jane', 25]];

    downloadCSV('test.csv', headers, rows);

    // Verify Blob creation
    expect(capturedBlobArgs.length).toBeGreaterThan(0);
    const blobParts = capturedBlobArgs[0];
    const blobContent = blobParts[0];
    expect(blobContent).toBe('\uFEFFName,Age\r\nJohn,30\r\nJane,25');

    // Verify DOM manipulations
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(createElementMock).toHaveBeenCalledWith('a');
    expect(setAttributeMock).toHaveBeenCalledWith('href', 'mock-url');
    expect(setAttributeMock).toHaveBeenCalledWith('download', 'test.csv');
    expect(appendChildMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(removeChildMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('mock-url');
  });

  test('should handle edge cases and escaping properly', () => {
    let capturedBlobArgs: any[] = [];
    global.Blob = mock((...args: any[]) => {
      capturedBlobArgs = args;
      return { type: 'text/csv;charset=utf-8;' };
    }) as any;

    const headers = ['A', 'B', 'C'];
    const rows = [
      ['Value with, comma', 'Value with "quotes"', 'Value with \n newline'],
      [null as any, undefined as any, 123]
    ];

    downloadCSV('test.csv', headers, rows);

    const blobParts = capturedBlobArgs[0];
    const blobContent = blobParts[0];
    const lines = blobContent.split('\r\n');

    // Header
    expect(lines[0]).toBe('\uFEFF' + 'A,B,C');
    // Row 1: Escaped values
    expect(lines[1]).toBe('"Value with, comma","Value with ""quotes""","Value with \n newline"');
    // Row 2: Null, Undefined, Numbers
    expect(lines[2]).toBe(',,123');
  });
});
