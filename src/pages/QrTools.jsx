import { useMemo, useState } from 'react';
import { Download, Link as LinkIcon, Type, UserRound, RefreshCw, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import './QrTools.css';

const TAB_OPTIONS = [
  { key: 'url', label: 'URL', Icon: LinkIcon },
  { key: 'text', label: 'Text/Name', Icon: Type },
  { key: 'contact', label: 'Contact Card', Icon: UserRound },
];

function toVCard({ fullName, phone, email, website }) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${fullName || ''}`,
    phone ? `TEL:${phone}` : '',
    email ? `EMAIL:${email}` : '',
    website ? `URL:${website}` : '',
    'END:VCARD',
  ].filter(Boolean);

  return lines.join('\n');
}

export default function QrToolsPage() {
  const [activeTab, setActiveTab] = useState('url');
  const [urlValue, setUrlValue] = useState('https://trasealla.com');
  const [textValue, setTextValue] = useState('Trasealla Beauty Center');
  const [contact, setContact] = useState({
    fullName: 'Trasealla Beauty Center',
    phone: '+971501234567',
    email: 'info@trasealla.com',
    website: 'https://trasealla.com',
  });

  const [size, setSize] = useState(320);
  const [margin, setMargin] = useState(2);
  const [fgColor, setFgColor] = useState('#111827');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const getQrOptions = () => ({
    width: Number(size),
    margin: Number(margin),
    color: {
      dark: fgColor,
      light: bgColor,
    },
  });

  const payload = useMemo(() => {
    if (activeTab === 'url') return urlValue.trim();
    if (activeTab === 'text') return textValue.trim();
    return toVCard(contact);
  }, [activeTab, urlValue, textValue, contact]);

  const hasPayload = payload && payload.length > 0;

  const handleGenerate = async () => {
    if (!hasPayload) {
      setError('Please enter content first.');
      return;
    }

    try {
      setError('');
      setIsGenerating(true);
      const dataUrl = await QRCode.toDataURL(payload, getQrOptions());
      setQrDataUrl(dataUrl);
    } catch (e) {
      setError(e?.message || 'Failed to generate QR code.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;

    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qr-code-${activeTab}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadSvg = async () => {
    if (!hasPayload) return;

    try {
      const svgString = await QRCode.toString(payload, { ...getQrOptions(), type: 'svg' });
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qr-code-${activeTab}-${Date.now()}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.message || 'Failed to generate SVG file.');
    }
  };

  const handleDownloadPdf = async () => {
    if (!hasPayload) return;

    try {
      const imageDataUrl = qrDataUrl || await QRCode.toDataURL(payload, getQrOptions());
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgSize = 120;
      const x = (pageWidth - imgSize) / 2;
      const y = (pageHeight - imgSize) / 2 - 12;

      pdf.setFontSize(16);
      pdf.text('Generated QR Code', pageWidth / 2, y - 10, { align: 'center' });
      pdf.addImage(imageDataUrl, 'PNG', x, y, imgSize, imgSize);

      pdf.setFontSize(10);
      pdf.text(`Payload type: ${activeTab.toUpperCase()}`, pageWidth / 2, y + imgSize + 10, { align: 'center' });

      pdf.save(`qr-code-${activeTab}-${Date.now()}.pdf`);
    } catch (e) {
      setError(e?.message || 'Failed to generate PDF file.');
    }
  };

  const resetCurrent = () => {
    if (activeTab === 'url') setUrlValue('https://trasealla.com');
    if (activeTab === 'text') setTextValue('Trasealla Beauty Center');
    if (activeTab === 'contact') {
      setContact({
        fullName: 'Trasealla Beauty Center',
        phone: '+971501234567',
        email: 'info@trasealla.com',
        website: 'https://trasealla.com',
      });
    }
    setError('');
    setQrDataUrl('');
  };

  return (
    <div className="qr-tools-page">
      <div className="qr-tools-hero">
        <div>
          <h1>Generate QR Codes</h1>
          <p>Create branded QR codes for links, names, and contact cards, then download them instantly.</p>
        </div>
        <button className="qr-btn qr-btn-primary" onClick={handleGenerate} disabled={isGenerating || !hasPayload}>
          <QrCode size={16} /> {isGenerating ? 'Generating...' : 'Generate QR'}
        </button>
      </div>

      <div className="qr-tools-grid">
        <section className="qr-card">
          <div className="qr-tabs" role="tablist" aria-label="QR Content Type">
            {TAB_OPTIONS.map(({ key, label, Icon }) => (
              <button
                key={key}
                className={`qr-tab ${activeTab === key ? 'active' : ''}`}
                onClick={() => setActiveTab(key)}
                type="button"
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          {activeTab === 'url' && (
            <div className="qr-fieldset">
              <label>Target URL</label>
              <input
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://example.com"
                type="url"
              />
            </div>
          )}

          {activeTab === 'text' && (
            <div className="qr-fieldset">
              <label>Text or Name</label>
              <textarea
                rows={5}
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="Type any name, message, or code"
              />
            </div>
          )}

          {activeTab === 'contact' && (
            <div className="qr-fieldset qr-contact-grid">
              <div>
                <label>Full Name</label>
                <input
                  value={contact.fullName}
                  onChange={(e) => setContact((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="Contact name"
                />
              </div>
              <div>
                <label>Phone</label>
                <input
                  value={contact.phone}
                  onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+971..."
                />
              </div>
              <div>
                <label>Email</label>
                <input
                  value={contact.email}
                  onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))}
                  placeholder="name@company.com"
                  type="email"
                />
              </div>
              <div>
                <label>Website</label>
                <input
                  value={contact.website}
                  onChange={(e) => setContact((p) => ({ ...p, website: e.target.value }))}
                  placeholder="https://..."
                  type="url"
                />
              </div>
            </div>
          )}

          <div className="qr-config-grid">
            <div className="qr-fieldset">
              <label>Size (px)</label>
              <input type="range" min="180" max="720" step="10" value={size} onChange={(e) => setSize(Number(e.target.value))} />
              <span>{size}px</span>
            </div>
            <div className="qr-fieldset">
              <label>Quiet Margin</label>
              <input type="range" min="0" max="8" step="1" value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
              <span>{margin}</span>
            </div>
            <div className="qr-fieldset">
              <label>Foreground</label>
              <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} />
            </div>
            <div className="qr-fieldset">
              <label>Background</label>
              <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
            </div>
          </div>

          {error && <div className="qr-error">{error}</div>}

          <div className="qr-actions">
            <button className="qr-btn qr-btn-ghost" onClick={resetCurrent} type="button">
              <RefreshCw size={15} /> Reset
            </button>
            <button className="qr-btn qr-btn-primary" onClick={handleGenerate} disabled={isGenerating || !hasPayload} type="button">
              <QrCode size={15} /> {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </section>

        <section className="qr-card qr-preview-card">
          <div className="qr-preview-header">
            <h3>Preview</h3>
            <div className="qr-download-actions">
              <button className="qr-btn qr-btn-outline" onClick={handleDownload} disabled={!qrDataUrl} type="button">
                <Download size={15} /> PNG
              </button>
              <button className="qr-btn qr-btn-outline" onClick={handleDownloadSvg} disabled={!hasPayload} type="button">
                <Download size={15} /> SVG
              </button>
              <button className="qr-btn qr-btn-outline" onClick={handleDownloadPdf} disabled={!hasPayload} type="button">
                <Download size={15} /> PDF
              </button>
            </div>
          </div>

          <div className="qr-preview-box">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Generated QR code" />
            ) : (
              <div className="qr-preview-empty">
                <QrCode size={28} />
                <p>Generate a QR code to preview here.</p>
              </div>
            )}
          </div>

          <div className="qr-preview-meta">
            <strong>Payload Preview</strong>
            <pre>{payload || '—'}</pre>
          </div>
        </section>
      </div>
    </div>
  );
}
