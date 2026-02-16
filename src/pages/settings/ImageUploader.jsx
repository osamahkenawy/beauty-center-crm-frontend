import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';

export default function ImageUploader({ value, onChange, folder = 'general', api, label = 'Upload image', accept = 'image/*', className = '' }) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      const res = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.success) {
        onChange(res.data.url, res.data.key);
      }
    } catch (e) {
      console.error('Upload failed:', e);
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files[0]);
  };

  const handleRemove = async () => {
    onChange('', '');
  };

  return (
    <div className={`image-uploader ${className}`}>
      {value ? (
        <div className="image-uploader-preview">
          <img src={value} alt="Uploaded" />
          <button className="image-uploader-remove" onClick={handleRemove}><X size={14} /></button>
        </div>
      ) : (
        <div
          className={`image-uploader-dropzone ${dragActive ? 'active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <div className="upload-loading"><Loader size={20} className="spin" /> Uploading...</div>
          ) : (
            <>
              <ImageIcon size={24} strokeWidth={1.5} />
              <span>{label}</span>
              <small>Click or drag & drop</small>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files[0]) handleUpload(e.target.files[0]); }}
          />
        </div>
      )}
    </div>
  );
}
