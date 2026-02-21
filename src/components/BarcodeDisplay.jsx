/**
 * BarcodeDisplay — Shows barcode / QR image for a given entity
 *
 * Props:
 *   show      {boolean}   – visibility
 *   onClose   {fn}        – close callback
 *   type      {string}    – 'product' | 'giftcard' | 'appointment'
 *   entityId  {number}    – entity id
 *   label     {string}    – display name / code / title
 *   subLabel  {string}    – secondary line (SKU, value, time, etc.)
 *
 * Images are fetched from:
 *   /api/barcodes/product/:id           → Code128 barcode PNG
 *   /api/barcodes/product/:id/qr        → QR PNG
 *   /api/barcodes/giftcard/:id/qr       → QR PNG
 *   /api/barcodes/appointment/:id/qr    → QR PNG
 */

import { useState, useCallback } from 'react';
import {
  X, Barcode, QrCode, Download, Printer, Copy, CheckCircle,
  Package, Gift, Calendar, LayoutGrid
} from 'lucide-react';
import './BarcodeDisplay.css';

// Base URL for backend (same origin in prod, proxy in dev)
const API_BASE = '/api';

const ENTITY_META = {
  product:     { icon: Package,  color: '#244066', bg: '#eff6ff' },
  giftcard:    { icon: Gift,     color: '#be185d', bg: '#fdf2f8' },
  appointment: { icon: Calendar, color: '#0369a1', bg: '#f0f9ff' },
};

export default function BarcodeDisplay({ show, onClose, type = 'product', entityId, label = '', subLabel = '' }) {
  const [view, setView]       = useState('both');  // 'barcode' | 'qr' | 'both'
  const [copied, setCopied]   = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  const supportsBarcode = type === 'product';
  const supportsQR      = true;

  // ── URL builders ─────────────────────────────────────────
  const barcodeUrl = `${API_BASE}/barcodes/product/${entityId}`;
  const qrUrl = {
    product:     `${API_BASE}/barcodes/product/${entityId}/qr`,
    giftcard:    `${API_BASE}/barcodes/giftcard/${entityId}/qr`,
    appointment: `${API_BASE}/barcodes/appointment/${entityId}/qr`,
  }[type];

  // Append auth token so the image request is authenticated
  const token = (() => {
    try { return localStorage.getItem('crm_token') || ''; } catch { return ''; }
  })();
  const authParam = token ? `?token=${encodeURIComponent(token)}` : '';
  const barcodeImgUrl = barcodeUrl + authParam;
  const qrImgUrl      = qrUrl + authParam;

  // ── Download ──────────────────────────────────────────────
  const downloadImage = useCallback(async (url, filename) => {
    try {
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Download failed', err);
    }
  }, [token]);

  // ── Print ─────────────────────────────────────────────────
  const handlePrint = useCallback(async () => {
    setPrintLoading(true);
    try {
      // Fetch both images as base64 for offline print
      const toBase64 = async (url) => {
        const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      };

      const imgs = [];
      if (supportsBarcode && (view === 'barcode' || view === 'both')) {
        imgs.push({ src: await toBase64(barcodeUrl), caption: 'Barcode' });
      }
      if (supportsQR && (view === 'qr' || view === 'both')) {
        imgs.push({ src: await toBase64(qrUrl), caption: 'QR Code' });
      }

      const win = window.open('', '_blank', 'width=600,height=500');
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print — ${label}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; background: #fff; }
            .entity-title { font-size: 14pt; font-weight: 700; margin-bottom: 4px; }
            .entity-sub   { font-size: 10pt; color: #666; margin-bottom: 18px; }
            .codes { display: flex; gap: 32px; align-items: flex-start; flex-wrap: wrap; }
            .code-block { display: flex; flex-direction: column; align-items: center; gap: 6px; }
            .code-block img { max-width: 240px; image-rendering: pixelated; }
            .code-caption { font-size: 9pt; color: #888; }
            @media print { body { padding: 12px; } }
          </style>
        </head>
        <body>
          <div class="entity-title">${label}</div>
          ${subLabel ? `<div class="entity-sub">${subLabel}</div>` : ''}
          <div class="codes">
            ${imgs.map(i => `<div class="code-block"><img src="${i.src}" alt="${i.caption}" /><span class="code-caption">${i.caption}</span></div>`).join('')}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
        </html>
      `);
      win.document.close();
    } catch (err) {
      console.error('Print error', err);
    } finally {
      setPrintLoading(false);
    }
  }, [view, supportsBarcode, supportsQR, barcodeUrl, qrUrl, label, subLabel, token]);

  // ── Copy label to clipboard ───────────────────────────────
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(label).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [label]);

  if (!show) return null;

  const meta = ENTITY_META[type] || ENTITY_META.product;
  const EntityIcon = meta.icon;

  const viewTabs = [
    supportsBarcode && supportsQR ? { id: 'both',    label: 'Both',    icon: LayoutGrid } : null,
    supportsBarcode               ? { id: 'barcode', label: 'Barcode', icon: Barcode }    : null,
    supportsQR                    ? { id: 'qr',      label: 'QR Code', icon: QrCode }     : null,
  ].filter(Boolean);

  const showBarcode = supportsBarcode && (view === 'barcode' || view === 'both');
  const showQR      = supportsQR      && (view === 'qr'      || view === 'both');

  return (
    <div className="bd-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="bd-modal">
        {/* Header */}
        <div className="bd-header" style={{ background: `linear-gradient(135deg, ${meta.color}dd 0%, ${meta.color} 100%)` }}>
          <div className="bd-header-left">
            <EntityIcon size={20} className="bd-header-icon" />
            <div>
              <div className="bd-header-title">{label}</div>
              {subLabel && <div className="bd-header-sub">{subLabel}</div>}
            </div>
          </div>
          <button className="bd-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* View tabs */}
        {viewTabs.length > 1 && (
          <div className="bd-view-tabs">
            {viewTabs.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  className={`bd-view-tab ${view === t.id ? 'bd-view-tab--active' : ''}`}
                  onClick={() => setView(t.id)}
                >
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Code images */}
        <div className="bd-body">
          <div className={`bd-codes bd-codes--${view}`}>
            {showBarcode && (
              <div className="bd-code-block">
                <div className="bd-code-label">Barcode (Code128)</div>
                <div className="bd-img-wrap">
                  <img
                    src={barcodeImgUrl}
                    alt="Product barcode"
                    className="bd-barcode-img"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                  <div className="bd-img-error" style={{ display: 'none' }}>
                    Barcode not available (product needs a barcode / SKU)
                  </div>
                </div>
                <button className="bd-dl-btn" onClick={() => downloadImage(barcodeUrl, `barcode-${type}-${entityId}.png`)}>
                  <Download size={13} /> Download PNG
                </button>
              </div>
            )}

            {showQR && (
              <div className="bd-code-block">
                <div className="bd-code-label">QR Code</div>
                <div className="bd-img-wrap">
                  <img
                    src={qrImgUrl}
                    alt="QR code"
                    className="bd-qr-img"
                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                  />
                  <div className="bd-img-error" style={{ display: 'none' }}>
                    QR code not available
                  </div>
                </div>
                <button className="bd-dl-btn" onClick={() => downloadImage(qrUrl, `qr-${type}-${entityId}.png`)}>
                  <Download size={13} /> Download PNG
                </button>
              </div>
            )}
          </div>

          {/* Copy label */}
          <button className="bd-copy-btn" onClick={handleCopy}>
            {copied
              ? <><CheckCircle size={14} className="bd-copy-ok" /> Copied!</>
              : <><Copy size={14} /> Copy code / ID</>}
          </button>
        </div>

        {/* Footer */}
        <div className="bd-footer">
          <button className="bd-btn bd-btn--secondary" onClick={onClose}>Close</button>
          <button className="bd-btn bd-btn--primary" onClick={handlePrint} disabled={printLoading}>
            {printLoading ? <span className="bd-spinner" /> : <Printer size={15} />}
            Print label
          </button>
        </div>
      </div>
    </div>
  );
}
