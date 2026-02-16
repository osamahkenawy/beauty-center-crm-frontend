import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

// ── Currency symbol map (common ones, fallback to code) ──
const SYMBOL_MAP = {
  AED: 'د.إ', USD: '$', EUR: '€', GBP: '£', SAR: '﷼', QAR: 'ر.ق', KWD: 'د.ك',
  BHD: '.د.ب', OMR: 'ر.ع.', EGP: 'E£', JOD: 'د.ا', LBP: 'ل.ل', IQD: 'ع.د',
  TRY: '₺', INR: '₹', PKR: '₨', JPY: '¥', CNY: '¥', KRW: '₩', THB: '฿',
  PHP: '₱', MYR: 'RM', SGD: 'S$', IDR: 'Rp', VND: '₫', BRL: 'R$', MXN: '$',
  ARS: '$', CLP: '$', COP: '$', PEN: 'S/', ZAR: 'R', NGN: '₦', KES: 'KSh',
  GHS: 'GH₵', MAD: 'د.م.', TND: 'د.ت', DZD: 'د.ج', CAD: 'CA$', AUD: 'A$',
  NZD: 'NZ$', CHF: 'CHF', SEK: 'kr', NOK: 'kr', DKK: 'kr', PLN: 'zł',
  CZK: 'Kč', HUF: 'Ft', RON: 'lei', BGN: 'лв', HRK: 'kn', RUB: '₽', UAH: '₴',
};

/**
 * Returns the symbol for a currency code
 */
export function getCurrencySymbol(code) {
  if (!code) return '$';
  return SYMBOL_MAP[code.toUpperCase()] || code;
}

// ── Singleton cache so we don't re-fetch on every component mount ──
let _cachedCurrency = null;
let _fetchPromise = null;

/**
 * Custom hook — returns { currency, symbol, format, loading }
 * Reads currency from the tenant settings (GET /tenants/current).
 * Caches the result in memory so it only fetches once per session.
 */
export default function useCurrency() {
  const [currency, setCurrency] = useState(_cachedCurrency || 'AED');
  const [loading, setLoading] = useState(!_cachedCurrency);

  useEffect(() => {
    if (_cachedCurrency) {
      setCurrency(_cachedCurrency);
      setLoading(false);
      return;
    }

    // If another component already triggered the fetch, piggy-back on it
    if (!_fetchPromise) {
      _fetchPromise = api.get('/tenants/current')
        .then(data => {
          const c = data?.data?.currency || 'AED';
          _cachedCurrency = c;
          return c;
        })
        .catch(() => {
          // Fallback: try localStorage
          try {
            const t = JSON.parse(localStorage.getItem('crm_tenant') || '{}');
            return t.currency || 'AED';
          } catch { return 'AED'; }
        })
        .finally(() => { _fetchPromise = null; });
    }

    _fetchPromise.then(c => {
      setCurrency(c);
      _cachedCurrency = c;
      setLoading(false);
    });
  }, []);

  const symbol = getCurrencySymbol(currency);

  /**
   * Format a number as currency.
   * e.g. format(150) → "AED 150.00" or "د.إ 150.00"
   */
  const format = useCallback((amount, { decimals = 2, symbolOnly = false } = {}) => {
    const val = parseFloat(amount || 0).toFixed(decimals);
    return symbolOnly ? `${symbol} ${val}` : `${currency} ${val}`;
  }, [currency, symbol]);

  /**
   * Force-refresh the cached currency (e.g. after user changes it in settings).
   */
  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/tenants/current');
      const c = data?.data?.currency || 'AED';
      _cachedCurrency = c;
      setCurrency(c);
    } catch { /* ignore */ }
  }, []);

  return { currency, symbol, format, loading, refresh };
}

/**
 * Invalidate the cached currency (call after saving business settings).
 */
export function invalidateCurrencyCache() {
  _cachedCurrency = null;
  _fetchPromise = null;
}
