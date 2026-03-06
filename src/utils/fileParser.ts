import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import type { FieldSchema } from '../types/schema';

type DataType = FieldSchema['dataType'];

function inferType(value: string): DataType {
  if (!value || value.trim() === '') return 'string';
  if (!isNaN(Number(value))) return 'number';
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{2}\/\d{2}\/\d{4}$/,
    /^\d{2}-\d{2}-\d{4}$/,
  ];
  if (datePatterns.some((p) => p.test(value.trim()))) return 'date';
  const lower = value.toLowerCase().trim();
  if (lower === 'true' || lower === 'false' || lower === 'yes' || lower === 'no') return 'boolean';
  return 'string';
}

function inferTypeFromCellType(cellType: string, value: string): DataType {
  switch (cellType) {
    case 'n': return 'number';
    case 'b': return 'boolean';
    case 'd': return 'date';
    default: return inferType(value);
  }
}

export async function parseXLSX(file: File): Promise<FieldSchema[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const fields: FieldSchema[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
    const headers: string[] = [];

    // Row 0 = headers
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = sheet[cellAddr];
      headers[col] = cell ? String(cell.v) : `Column${col + 1}`;
    }

    // Rows 1–4 = sample values
    for (let col = range.s.c; col <= range.e.c; col++) {
      const header = headers[col];
      if (!header) continue;
      const sampleValues: string[] = [];
      let inferredType: DataType = 'string';

      for (let row = 1; row <= Math.min(4, range.e.r); row++) {
        const cellAddr = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = sheet[cellAddr];
        if (cell) {
          const val = cell.v instanceof Date ? cell.v.toISOString().split('T')[0] : String(cell.v);
          sampleValues.push(val ?? '');
          if (row === 1) {
            inferredType = inferTypeFromCellType(cell.t, val ?? '');
          }
        }
      }

      fields.push({
        id: uuidv4(),
        source: 'xlsx',
        sheetOrPath: sheetName,
        fieldName: header,
        dataType: inferredType,
        sampleValues,
      });
    }
  }

  return fields;
}

function walkXMLNode(node: Element, path: string, fields: FieldSchema[]): void {
  const children = Array.from(node.children);
  if (children.length === 0) {
    // Leaf node
    const text = node.textContent?.trim() ?? '';
    const existing = fields.find((f) => f.sheetOrPath === path && f.fieldName === node.tagName);
    if (existing) {
      if (text && existing.sampleValues.length < 4) {
        existing.sampleValues.push(text);
      }
    } else {
      fields.push({
        id: uuidv4(),
        source: 'xml',
        sheetOrPath: path,
        fieldName: node.tagName,
        dataType: inferType(text),
        sampleValues: text ? [text] : [],
      });
    }
  } else {
    for (const child of children) {
      walkXMLNode(child, path ? `${path}/${node.tagName}` : node.tagName, fields);
    }
  }
}

export async function parseXML(file: File): Promise<FieldSchema[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'application/xml');
        const parseError = doc.querySelector('parsererror');
        if (parseError) {
          reject(new Error('Invalid XML: ' + parseError.textContent));
          return;
        }
        const fields: FieldSchema[] = [];
        if (doc.documentElement) {
          for (const child of Array.from(doc.documentElement.children)) {
            walkXMLNode(child, doc.documentElement.tagName, fields);
          }
        }
        resolve(fields);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read XML file'));
    reader.readAsText(file);
  });
}

export async function extractSchema(xlsxFile?: File, xmlFile?: File): Promise<FieldSchema[]> {
  const results: FieldSchema[][] = await Promise.all([
    xlsxFile ? parseXLSX(xlsxFile) : Promise.resolve([]),
    xmlFile ? parseXML(xmlFile) : Promise.resolve([]),
  ]);
  return [...results[0], ...results[1]];
}
