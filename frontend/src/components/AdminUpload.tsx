import React, { useState, ChangeEvent, FormEvent, useEffect } from 'react';
import { uploadPDF } from '../api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

interface PDFRow {
  _id: string;
  filename: string;
  upload_date: string;
}

const AdminUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfs, setPdfs] = useState<PDFRow[]>([]);
  const [loadingPdfs, setLoadingPdfs] = useState(false);
  const [viewPdf, setViewPdf] = useState<{ filename: string; chunks: { chunk_index: number; text: string }[] } | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
    setSuccess(null);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setSuccess(null);
    setError(null);
    try {
      const data = await uploadPDF(file);
      setSuccess(`Upload successful! Chunks stored: ${data.chunks_stored}`);
      fetchPdfs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const fetchPdfs = async () => {
    setLoadingPdfs(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/pdfs`);
      if (!res.ok) throw new Error('Failed to fetch PDFs');
      const data = await res.json();
      setPdfs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingPdfs(false);
    }
  };

  useEffect(() => {
    fetchPdfs();
  }, []);

  const handleView = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/pdf/${id}`);
      if (!res.ok) throw new Error('Failed to fetch PDF data');
      const data = await res.json();
      setViewPdf(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/pdf/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete PDF');
      fetchPdfs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-upload-container">
      <h2>Admin PDF Upload</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" accept="application/pdf" onChange={handleFileChange} disabled={uploading} />
        <button type="submit" disabled={uploading || !file}>Upload</button>
      </form>
      {uploading && <div className="info">Uploading...</div>}
      {success && <div className="success">{success}</div>}
      {error && <div className="error">{error}</div>}
      <h3>Uploaded PDFs</h3>
      {loadingPdfs ? (
        <div className="info">Loading PDFs...</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 12px', marginTop: 16 }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '2px solid #e3eafc', textAlign: 'left', padding: '8px 12px' }}>Filename</th>
              <th style={{ borderBottom: '2px solid #e3eafc', textAlign: 'left', padding: '8px 12px' }}>Object ID</th>
              <th style={{ borderBottom: '2px solid #e3eafc', textAlign: 'left', padding: '8px 12px' }}>Upload Date</th>
              <th style={{ borderBottom: '2px solid #e3eafc', textAlign: 'center', padding: '8px 12px' }}>View</th>
              <th style={{ borderBottom: '2px solid #e3eafc', textAlign: 'center', padding: '8px 12px' }}>Delete</th>
            </tr>
          </thead>
          <tbody>
            {pdfs.map(pdf => (
              <tr key={pdf._id} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(10,37,64,0.04)' }}>
                <td style={{ padding: '8px 12px', borderTop: '1px solid #f0f4fb' }}>{pdf.filename}</td>
                <td style={{ padding: '8px 12px', borderTop: '1px solid #f0f4fb', fontSize: 13, color: '#555' }}>{pdf._id}</td>
                <td style={{ padding: '8px 12px', borderTop: '1px solid #f0f4fb', fontSize: 13, color: '#1976d2' }}>{pdf.upload_date ? new Date(pdf.upload_date).toLocaleString() : ''}</td>
                <td style={{ padding: '8px 12px', borderTop: '1px solid #f0f4fb', textAlign: 'center' }}>
                  <button type="button" onClick={() => handleView(pdf._id)} style={{ background: '#0a2540', color: '#fff', borderRadius: 6, padding: '6px 18px', border: 'none', fontWeight: 500, cursor: 'pointer' }}>View</button>
                </td>
                <td style={{ padding: '8px 12px', borderTop: '1px solid #f0f4fb', textAlign: 'center' }}>
                  <button type="button" onClick={() => handleDelete(pdf._id)} style={{ background: '#d32f2f', color: '#fff', borderRadius: 6, padding: '6px 18px', border: 'none', fontWeight: 500, cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {viewPdf && (
        <div style={{ marginTop: 24, background: '#f7fafc', padding: 16, borderRadius: 8 }}>
          <h4>PDF: {viewPdf.filename}</h4>
          <div style={{ maxHeight: 300, overflowY: 'auto', fontSize: 14 }}>
            {viewPdf.chunks.map(chunk => (
              <div key={chunk.chunk_index} style={{ marginBottom: 8 }}>
                <b>Chunk {chunk.chunk_index + 1}:</b>
                <div>{chunk.text}</div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setViewPdf(null)} style={{ marginTop: 8 }}>Close</button>
        </div>
      )}
    </div>
  );
};

export default AdminUpload;
