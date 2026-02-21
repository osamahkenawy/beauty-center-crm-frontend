/**
 * BarcodeScanner — Universal scanner modal
 *
 * Supports three input modes:
 *   1. camera    – html5-qrcode library (reads QR codes + most 1D barcodes)
 *   2. hardware  – hidden input field; hardware USB/Bluetooth scanners act as
 *                  keyboards and end with Enter → detected as rapid keystrokes
 *   3. manual    – regular text input where staff type / paste the code
 *
 * Props:
 *   show      {boolean}   – controls visibility
 *   onClose   {fn}        – modal close callback  
 *   onResult  {fn(type, data)} – called with resolved entity:
 *                               type  = 'product' | 'giftcard' | 'appointment'
 *                               data  = entity object from /api/barcodes/lookup
 *   title     {string}    – optional modal title  (default: "Scan Barcode / QR")
 *   hint      {string}    – optional instruction below the scanner
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, Zap, Keyboard, Search, X, CheckCircle, AlertCircle, RefreshCw, Bluetooth } from 'lucide-react';
import api from '../lib/api';
import './BarcodeScanner.css';

const MODES = [
  { id: 'camera',   label: 'Camera',          icon: Camera },
  { id: 'hardware', label: 'Hardware Scanner', icon: Bluetooth },
  { id: 'manual',   label: 'Manual Entry',     icon: Keyboard },
];

export default function BarcodeScanner({ show, onClose, onResult, title = 'Scan Barcode / QR Code', hint }) {
  const [mode, setMode] = useState('camera');
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [result, setResult] = useState(null);   // { type, data }
  const [error, setError]   = useState('');
  const [manualCode, setManualCode] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [hwCode, setHwCode] = useState('');

  const html5QrcodeRef = useRef(null);
  const hardwareInputRef = useRef(null);
  const hwBufferRef = useRef('');
  const hwTimerRef  = useRef(null);
  const scannerDivId = 'bs-camera-view';
  const resolvedRef = useRef(false);  // prevent multiple lookup calls from one scan

  // ── reset when shown ──────────────────────────────────────
  useEffect(() => {
    if (show) {
      setResult(null);
      setError('');
      setManualCode('');
      setHwCode('');
      hwBufferRef.current = '';
      resolvedRef.current = false;
    } else {
      stopCamera();
    }
  }, [show]);

  // ── start/stop camera when mode changes ──────────────────
  useEffect(() => {
    if (!show) return;
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    if (mode === 'hardware' && hardwareInputRef.current) {
      hardwareInputRef.current.focus();
    }
    return () => { if (mode === 'camera') stopCamera(); };
  }, [mode, show]);

  // ── Camera helpers ────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError('');
    setScanning(true);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setError('No camera found. Use Hardware Scanner or Manual Entry instead.');
        setScanning(false);
        return;
      }
      setCameras(devices);
      const camId = selectedCamera || devices[devices.length - 1].id; // prefer back camera
      setSelectedCamera(camId);

      const scanner = new Html5Qrcode(scannerDivId, { verbose: false });
      html5QrcodeRef.current = scanner;

      await scanner.start(
        camId,
        { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 },
        (decodedText) => {
          if (!resolvedRef.current) {
            resolvedRef.current = true;
            handleCodeScanned(decodedText);
          }
        },
        () => {} // onError — suppress continuous frame errors
      );
    } catch (err) {
      const msg = err?.message || String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setError('Camera permission denied. Use Hardware Scanner or Manual Entry instead.');
      } else {
        setError(`Camera error: ${msg}`);
      }
      setScanning(false);
    }
  }, [selectedCamera]);

  const stopCamera = useCallback(async () => {
    if (html5QrcodeRef.current) {
      try {
        const s = html5QrcodeRef.current;
        if (s.isScanning) await s.stop();
        s.clear();
      } catch (_) {}
      html5QrcodeRef.current = null;
    }
    setScanning(false);
  }, []);

  const switchCamera = useCallback(async () => {
    await stopCamera();
    const idx = cameras.findIndex(c => c.id === selectedCamera);
    const next = cameras[(idx + 1) % cameras.length];
    if (next) {
      resolvedRef.current = false;
      setSelectedCamera(next.id);
      setTimeout(() => startCamera(), 200);
    }
  }, [cameras, selectedCamera, stopCamera, startCamera]);

  // ── Hardware scanner (keyboard emulation) ─────────────────
  // Hardware scanners fire keystrokes very fast (~5ms between chars) and end with Enter.
  // We buffer characters; if Enter is pressed within 100ms of the first char, it's a scan.
  const handleHwKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const buffered = hwBufferRef.current.trim();
      clearTimeout(hwTimerRef.current);
      hwBufferRef.current = '';
      if (buffered && !resolvedRef.current) {
        resolvedRef.current = true;
        setHwCode(buffered);
        handleCodeScanned(buffered);
      }
    } else if (e.key.length === 1) {
      // Regular character
      hwBufferRef.current += e.key;
      clearTimeout(hwTimerRef.current);
      // If no Enter after 500ms, treat as manual partial input
      hwTimerRef.current = setTimeout(() => {
        hwBufferRef.current = '';
      }, 500);
    }
  }, []);

  // Also watch for paste events (some software scanners use clipboard)
  const handleHwPaste = useCallback((e) => {
    const text = (e.clipboardData || window.clibboardData).getData('text').trim();
    if (text && !resolvedRef.current) {
      resolvedRef.current = true;
      setHwCode(text);
      handleCodeScanned(text);
    }
  }, []);

  // ── Lookup code against API ───────────────────────────────
  const handleCodeScanned = useCallback(async (code) => {
    if (!code) return;
    setLooking(true);
    setError('');
    try {
      const res = await api.get(`/barcodes/lookup?code=${encodeURIComponent(code)}`);
      if (res.success) {
        setResult({ type: res.type, data: res.data });
      } else {
        setError(`Not found: ${code}`);
        resolvedRef.current = false;
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Lookup failed';
      setError(msg);
      resolvedRef.current = false;
    } finally {
      setLooking(false);
    }
  }, []);

  const handleManualSubmit = useCallback((e) => {
    e.preventDefault();
    if (!manualCode.trim() || resolvedRef.current) return;
    resolvedRef.current = true;
    handleCodeScanned(manualCode.trim());
  }, [manualCode, handleCodeScanned]);

  const handleAccept = useCallback(() => {
    if (result) {
      onResult?.(result.type, result.data);
      onClose?.();
    }
  }, [result, onResult, onClose]);

  const handleRetry = useCallback(() => {
    setResult(null);
    setError('');
    setManualCode('');
    setHwCode('');
    resolvedRef.current = false;
    if (mode === 'camera') {
      stopCamera().then(() => {
        setTimeout(() => startCamera(), 300);
      });
    } else if (mode === 'hardware' && hardwareInputRef.current) {
      hardwareInputRef.current.focus();
    }
  }, [mode, stopCamera, startCamera]);

  if (!show) return null;

  const resultIcon = result
    ? <CheckCircle size={36} className="bs-result-icon bs-result-icon--ok" />
    : error
      ? <AlertCircle size={36} className="bs-result-icon bs-result-icon--err" />
      : null;

  return (
    <div className="bs-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="bs-modal">
        {/* Header */}
        <div className="bs-header">
          <div className="bs-header-left">
            <Zap size={20} className="bs-header-icon" />
            <span className="bs-header-title">{title}</span>
          </div>
          <button className="bs-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Mode tabs */}
        <div className="bs-mode-tabs">
          {MODES.map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                className={`bs-mode-tab ${mode === m.id ? 'bs-mode-tab--active' : ''}`}
                onClick={() => { setMode(m.id); setResult(null); setError(''); resolvedRef.current = false; setManualCode(''); setHwCode(''); }}
              >
                <Icon size={15} />
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="bs-body">
          {hint && <p className="bs-hint">{hint}</p>}

          {/* ── CAMERA MODE ── */}
          {mode === 'camera' && (
            <div className="bs-camera-section">
              {error && !scanning ? (
                <div className="bs-camera-error">
                  <AlertCircle size={28} />
                  <p>{error}</p>
                </div>
              ) : (
                <>
                  <div id={scannerDivId} className="bs-camera-view" />
                  {cameras.length > 1 && (
                    <button className="bs-switch-cam" onClick={switchCamera} title="Switch camera">
                      <RefreshCw size={16} /> Switch camera
                    </button>
                  )}
                  {!scanning && !error && (
                    <div className="bs-camera-loading">
                      <div className="bs-spinner" /> Starting camera…
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── HARDWARE SCANNER MODE ── */}
          {mode === 'hardware' && (
            <div className="bs-hw-section">
              <div className="bs-hw-icon-area">
                <Bluetooth size={48} className="bs-hw-icon" />
                <p className="bs-hw-title">Ready for hardware scanner</p>
                <p className="bs-hw-sub">
                  Connect your USB or Bluetooth barcode scanner and scan any product,
                  gift card, or appointment QR code. The scanner acts as a keyboard
                  and sends data automatically.
                </p>
              </div>
              {/* Hidden input captures hardware scanner keystrokes */}
              <input
                ref={hardwareInputRef}
                className="bs-hw-input"
                type="text"
                readOnly
                value={hwCode}
                onKeyDown={handleHwKeyDown}
                onPaste={handleHwPaste}
                placeholder="Focus here & scan…"
                autoFocus
              />
              <button
                className="bs-hw-focus-btn"
                onClick={() => hardwareInputRef.current?.focus()}
              >
                Click here then scan with your device
              </button>
            </div>
          )}

          {/* ── MANUAL ENTRY MODE ── */}
          {mode === 'manual' && (
            <div className="bs-manual-section">
              <form onSubmit={handleManualSubmit} className="bs-manual-form">
                <label className="bs-manual-label">
                  Enter barcode, SKU, or gift card code
                </label>
                <div className="bs-manual-row">
                  <input
                    type="text"
                    className="bs-manual-input"
                    value={manualCode}
                    onChange={e => { setManualCode(e.target.value); setError(''); resolvedRef.current = false; }}
                    placeholder="e.g. MOR-SHP-001 or GC-ABCD-1234"
                    autoFocus
                  />
                  <button type="submit" className="bs-manual-btn" disabled={!manualCode.trim() || looking}>
                    {looking ? <span className="bs-spinner bs-spinner--sm" /> : <Search size={18} />}
                    Look up
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── LOADING ── */}
          {looking && (
            <div className="bs-looking">
              <span className="bs-spinner" /> Resolving code…
            </div>
          )}

          {/* ── ERROR ── */}
          {error && mode !== 'camera' && (
            <div className="bs-error">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* ── RESULT CARD ── */}
          {result && (
            <div className={`bs-result bs-result--${result.type}`}>
              <div className="bs-result-header">
                {resultIcon}
                <div>
                  <div className="bs-result-type">{result.type.toUpperCase()} FOUND</div>
                  <div className="bs-result-name">
                    {result.type === 'product'     && (result.data.name)}
                    {result.type === 'giftcard'    && `Gift Card: ${result.data.code}`}
                    {result.type === 'appointment' && `Appointment #${result.data.id}`}
                  </div>
                </div>
              </div>

              {/* ── Product details ── */}
              {result.type === 'product' && (
                <div className="bs-result-details">
                  {result.data.sku     && <span><b>SKU:</b> {result.data.sku}</span>}
                  {result.data.brand   && <span><b>Brand:</b> {result.data.brand}</span>}
                  {result.data.category && <span><b>Category:</b> {result.data.category}</span>}
                  {result.data.retail_price != null && <span><b>Price:</b> {Number(result.data.retail_price).toFixed(2)}</span>}
                  <span className={`bs-result-stock ${result.data.stock_quantity <= 0 ? 'bs-result-stock--out' : ''}`}>
                    <b>Stock:</b> {result.data.stock_quantity} {result.data.unit || 'units'}
                  </span>
                </div>
              )}

              {/* ── Gift card details ── */}
              {result.type === 'giftcard' && (
                <div className="bs-result-details">
                  <span><b>Status:</b> <span className={`bs-gc-status bs-gc-status--${result.data.status}`}>{result.data.status}</span></span>
                  <span><b>Balance:</b> {Number(result.data.remaining_value).toFixed(2)} {result.data.currency}</span>
                  {result.data.issued_to_name && <span><b>Issued to:</b> {result.data.issued_to_name}</span>}
                  {result.data.expires_at && <span><b>Expires:</b> {new Date(result.data.expires_at).toLocaleDateString()}</span>}
                </div>
              )}

              {/* ── Appointment details ── */}
              {result.type === 'appointment' && (
                <div className="bs-result-details">
                  {(result.data.client_first || result.data.client_last) &&
                    <span><b>Client:</b> {[result.data.client_first, result.data.client_last].filter(Boolean).join(' ')}</span>}
                  {result.data.service_name && <span><b>Service:</b> {result.data.service_name}</span>}
                  {result.data.staff_name   && <span><b>Staff:</b> {result.data.staff_name}</span>}
                  {result.data.start_time   && <span><b>Time:</b> {new Date(result.data.start_time).toLocaleString()}</span>}
                  <span><b>Status:</b> <span className="bs-appt-status">{result.data.status}</span></span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="bs-footer">
          {result ? (
            <>
              <button className="bs-btn bs-btn--secondary" onClick={handleRetry}>
                <RefreshCw size={16} /> Scan again
              </button>
              <button className="bs-btn bs-btn--primary" onClick={handleAccept}>
                <CheckCircle size={16} />
                {result.type === 'product'     && 'Add to cart'}
                {result.type === 'giftcard'    && 'Use gift card'}
                {result.type === 'appointment' && 'Check in client'}
                {!['product','giftcard','appointment'].includes(result.type) && 'Use result'}
              </button>
            </>
          ) : (
            <button className="bs-btn bs-btn--secondary" onClick={onClose}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
