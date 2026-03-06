import React, { useState, useCallback, useRef } from 'react';
import { useSchemaStore } from './stores/useSchemaStore';
import { extractSchema } from './utils/fileParser';
import Toolbar from './components/Toolbar';
import Canvas from './components/Canvas';
import SchemaPanel from './components/SchemaPanel';
import PropertyPanel from './components/PropertyPanel';

interface FileInfo {
  name: string;
  size: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DropZone({
  label,
  accept,
  file,
  onFile,
}: {
  label: string;
  accept: string;
  file: FileInfo | null;
  onFile: (f: File) => void;
}): React.ReactElement {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) onFile(f);
    },
    [onFile]
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      style={{
        width: 280,
        minHeight: 160,
        border: `2px dashed ${dragging ? '#00d4ff' : file ? 'rgba(0,212,255,0.4)' : 'rgba(255,255,255,0.15)'}`,
        borderRadius: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        cursor: 'pointer',
        backgroundColor: dragging
          ? 'rgba(0,212,255,0.06)'
          : file
          ? 'rgba(0,212,255,0.04)'
          : 'rgba(255,255,255,0.02)',
        transition: 'all 0.2s',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />

      {file ? (
        <>
          <div style={{ fontSize: 32 }}>{accept.includes('xlsx') ? '📊' : '📄'}</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0', marginBottom: 4 }}>
              {file.name}
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>{file.size}</div>
            <div style={{
              display: 'inline-block',
              marginTop: 6,
              padding: '2px 8px',
              backgroundColor: accept.includes('xlsx') ? 'rgba(0,212,255,0.15)' : 'rgba(167,139,250,0.15)',
              color: accept.includes('xlsx') ? '#00d4ff' : '#a78bfa',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 700,
            }}>
              {accept.includes('xlsx') ? 'XLSX' : 'XML'}
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#555' }}>Click or drop to replace</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 40, opacity: 0.4 }}>{accept.includes('xlsx') ? '📊' : '📄'}</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#ccc', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 12, color: '#555' }}>Drop file or click to browse</div>
          </div>
        </>
      )}
    </div>
  );
}

function UploadPhase(): React.ReactElement {
  const setSchema = useSchemaStore((s) => s.setSchema);
  const [xlsxFile, setXlsxFile] = useState<FileInfo | null>(null);
  const [xmlFile, setXmlFile] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const xlsxRaw = useRef<File | null>(null);
  const xmlRaw = useRef<File | null>(null);

  const handleXlsx = useCallback((f: File) => {
    xlsxRaw.current = f;
    setXlsxFile({ name: f.name, size: formatBytes(f.size) });
    setError(null);
  }, []);

  const handleXml = useCallback((f: File) => {
    xmlRaw.current = f;
    setXmlFile({ name: f.name, size: formatBytes(f.size) });
    setError(null);
  }, []);

  const handleExtract = useCallback(async () => {
    if (!xlsxRaw.current && !xmlRaw.current) {
      setError('Please upload at least one file (XLSX or XML).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const schema = await extractSchema(
        xlsxRaw.current ?? undefined,
        xmlRaw.current ?? undefined
      );
      if (schema.length === 0) {
        setError('No fields found in the uploaded file(s). Check that your files have data.');
        return;
      }
      setSchema(schema);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse files. Check the format.');
    } finally {
      setLoading(false);
    }
  }, [setSchema]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f0f1a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif',
        color: '#e0e0e0',
        padding: 32,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            backgroundColor: '#00d4ff',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 800,
            color: '#0f0f1a',
          }}>
            R
          </div>
          <span style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>Report Designer</span>
        </div>
        <p style={{ fontSize: 15, color: '#888', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
          Upload your data files to extract the schema, then build a professional PDF report template.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
        <DropZone label="XLSX Spreadsheet" accept=".xlsx,.xls" file={xlsxFile} onFile={handleXlsx} />
        <DropZone label="XML Data File" accept=".xml" file={xmlFile} onFile={handleXml} />
      </div>

      {error && (
        <div style={{
          marginBottom: 20,
          padding: '10px 16px',
          backgroundColor: 'rgba(255, 80, 80, 0.1)',
          border: '1px solid rgba(255,80,80,0.3)',
          borderRadius: 8,
          color: '#ff6b6b',
          fontSize: 13,
          maxWidth: 584,
          width: '100%',
          textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleExtract}
        disabled={loading || (!xlsxFile && !xmlFile)}
        style={{
          padding: '12px 32px',
          backgroundColor: loading || (!xlsxFile && !xmlFile) ? 'rgba(0,212,255,0.3)' : '#00d4ff',
          border: 'none',
          borderRadius: 8,
          color: '#0f0f1a',
          fontSize: 15,
          fontWeight: 700,
          cursor: loading || (!xlsxFile && !xmlFile) ? 'not-allowed' : 'pointer',
          fontFamily: 'DM Sans, sans-serif',
          transition: 'all 0.2s',
          letterSpacing: 0.3,
        }}
      >
        {loading ? 'Extracting Schema…' : 'Extract Schema & Design →'}
      </button>

      <p style={{ marginTop: 16, fontSize: 11, color: '#444' }}>
        Files are processed entirely in your browser — nothing is uploaded to any server.
      </p>
    </div>
  );
}

function DesignerPhase(): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0f0f1a', fontFamily: 'DM Sans, sans-serif' }}>
      <Toolbar />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <SchemaPanel />
        <Canvas />
        <PropertyPanel />
      </div>
    </div>
  );
}

export default function App(): React.ReactElement {
  const schema = useSchemaStore((s) => s.schema);
  return schema.length === 0 ? <UploadPhase /> : <DesignerPhase />;
}
