import { useState, useEffect, useMemo } from 'react';

/**
 * Hook that fetches country data from REST Countries API.
 * Returns countries with their name, flag, currency, phone code, and map center coordinates.
 *
 * Data is cached globally so multiple components won't re-fetch.
 */

let cachedCountries = null;
let fetchPromise = null;

const fetchCountries = async () => {
  if (cachedCountries) return cachedCountries;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch('https://restcountries.com/v3.1/all?fields=name,cca2,flags,currencies,idd,latlng,capital,region,subregion')
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch countries');
      return res.json();
    })
    .then(data => {
      const processed = data
        .map(c => {
          // Extract currency info
          const currencyEntries = c.currencies ? Object.entries(c.currencies) : [];
          const primaryCurrency = currencyEntries.length > 0
            ? { code: currencyEntries[0][0], name: currencyEntries[0][1].name, symbol: currencyEntries[0][1].symbol || currencyEntries[0][0] }
            : null;

          // Phone code
          const phoneCode = c.idd?.root
            ? `${c.idd.root}${(c.idd.suffixes && c.idd.suffixes.length === 1) ? c.idd.suffixes[0] : ''}`
            : '';

          return {
            code: c.cca2,                        // "AE", "US", etc.
            name: c.name.common,                  // "United Arab Emirates"
            officialName: c.name.official,         // "United Arab Emirates"
            flag: c.flags?.svg || c.flags?.png || '', // Flag SVG URL
            flagEmoji: getFlagEmoji(c.cca2),       // 🇦🇪
            currency: primaryCurrency,             // { code: "AED", name: "UAE Dirham", symbol: "د.إ" }
            allCurrencies: currencyEntries.map(([code, info]) => ({
              code,
              name: info.name,
              symbol: info.symbol || code,
            })),
            phoneCode,                             // "+971"
            latlng: c.latlng || [0, 0],            // [24, 54]
            capital: c.capital?.[0] || '',          // "Abu Dhabi"
            region: c.region || '',                 // "Asia"
            subregion: c.subregion || '',           // "Western Asia"
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      cachedCountries = processed;
      return processed;
    })
    .catch(err => {
      console.error('useCountries: fetch error', err);
      fetchPromise = null; // Allow retry
      return getFallbackCountries();
    });

  return fetchPromise;
};

// Convert country code to flag emoji  "AE" → 🇦🇪
function getFlagEmoji(countryCode) {
  if (!countryCode) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Fallback for offline / API failure — covers common countries
function getFallbackCountries() {
  return [
    { code: 'AE', name: 'United Arab Emirates', flagEmoji: '🇦🇪', currency: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' }, latlng: [24, 54], phoneCode: '+971' },
    { code: 'SA', name: 'Saudi Arabia', flagEmoji: '🇸🇦', currency: { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' }, latlng: [25, 45], phoneCode: '+966' },
    { code: 'US', name: 'United States', flagEmoji: '🇺🇸', currency: { code: 'USD', name: 'US Dollar', symbol: '$' }, latlng: [38, -97], phoneCode: '+1' },
    { code: 'GB', name: 'United Kingdom', flagEmoji: '🇬🇧', currency: { code: 'GBP', name: 'British Pound', symbol: '£' }, latlng: [54, -2], phoneCode: '+44' },
    { code: 'DE', name: 'Germany', flagEmoji: '🇩🇪', currency: { code: 'EUR', name: 'Euro', symbol: '€' }, latlng: [51, 9], phoneCode: '+49' },
    { code: 'FR', name: 'France', flagEmoji: '🇫🇷', currency: { code: 'EUR', name: 'Euro', symbol: '€' }, latlng: [46, 2], phoneCode: '+33' },
    { code: 'IN', name: 'India', flagEmoji: '🇮🇳', currency: { code: 'INR', name: 'Indian Rupee', symbol: '₹' }, latlng: [20, 77], phoneCode: '+91' },
    { code: 'EG', name: 'Egypt', flagEmoji: '🇪🇬', currency: { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م' }, latlng: [27, 30], phoneCode: '+20' },
    { code: 'JO', name: 'Jordan', flagEmoji: '🇯🇴', currency: { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا' }, latlng: [31, 36], phoneCode: '+962' },
    { code: 'KW', name: 'Kuwait', flagEmoji: '🇰🇼', currency: { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك' }, latlng: [29.5, 45.75], phoneCode: '+965' },
    { code: 'QA', name: 'Qatar', flagEmoji: '🇶🇦', currency: { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق' }, latlng: [25.5, 51.25], phoneCode: '+974' },
    { code: 'BH', name: 'Bahrain', flagEmoji: '🇧🇭', currency: { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب' }, latlng: [26, 50.55], phoneCode: '+973' },
    { code: 'OM', name: 'Oman', flagEmoji: '🇴🇲', currency: { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع' }, latlng: [21, 57], phoneCode: '+968' },
    { code: 'TR', name: 'Turkey', flagEmoji: '🇹🇷', currency: { code: 'TRY', name: 'Turkish Lira', symbol: '₺' }, latlng: [39, 35], phoneCode: '+90' },
  ].sort((a, b) => a.name.localeCompare(b.name));
}

export default function useCountries() {
  const [countries, setCountries] = useState(cachedCountries || []);
  const [loading, setLoading] = useState(!cachedCountries);

  useEffect(() => {
    if (cachedCountries) {
      setCountries(cachedCountries);
      setLoading(false);
      return;
    }
    fetchCountries().then(data => {
      setCountries(data);
      setLoading(false);
    });
  }, []);

  /**
   * Find a country by its code (cca2), name, or partial match
   */
  const findCountry = useMemo(() => {
    return (query) => {
      if (!query || !countries.length) return null;
      const q = query.trim().toLowerCase();
      // Try exact code match
      const byCode = countries.find(c => c.code.toLowerCase() === q);
      if (byCode) return byCode;
      // Try exact name match
      const byName = countries.find(c => c.name.toLowerCase() === q);
      if (byName) return byName;
      // Try partial name match
      const byPartial = countries.find(c => c.name.toLowerCase().includes(q));
      if (byPartial) return byPartial;
      return null;
    };
  }, [countries]);

  /**
   * Get all unique currencies from countries
   */
  const allCurrencies = useMemo(() => {
    const seen = new Set();
    const result = [];
    countries.forEach(c => {
      if (c.currency && !seen.has(c.currency.code)) {
        seen.add(c.currency.code);
        result.push(c.currency);
      }
    });
    return result.sort((a, b) => a.code.localeCompare(b.code));
  }, [countries]);

  return { countries, loading, findCountry, allCurrencies };
}

export { getFlagEmoji };
