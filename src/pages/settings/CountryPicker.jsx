import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X, Globe } from 'lucide-react';

/**
 * Searchable country dropdown with flags.
 * Uses a portal so it's never clipped by overflow:hidden parents.
 */
export default function CountryPicker({ countries, value, onChange, loading, placeholder = 'Select country...' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const selected = countries.find(c => c.code === value || c.name === value);

  const filtered = search.trim()
    ? countries.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : countries;

  // Calc dropdown position from trigger
  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open, updatePos]);

  // Focus search input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const toggleOpen = () => {
    if (!open) updatePos();
    setOpen(o => !o);
    setSearch('');
  };

  const handleSelect = (country) => {
    onChange(country);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  // The portal dropdown
  const dropdown = open ? createPortal(
    <div
      ref={dropdownRef}
      className="cpk-dropdown"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: Math.max(pos.width, 320),
        zIndex: 9999,
      }}
    >
      {/* Search */}
      <div className="cpk-search-box">
        <Search size={15} className="cpk-search-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Type to search countries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="cpk-search-input"
        />
        {search && (
          <button type="button" className="cpk-search-clear" onClick={() => setSearch('')}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* List */}
      <div className="cpk-list">
        {loading ? (
          <div className="cpk-loading">
            <div className="cpk-spinner" />
            <span>Loading countries...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="cpk-empty">
            <Globe size={20} />
            <span>No countries match "{search}"</span>
          </div>
        ) : (
          filtered.map(c => (
            <button
              key={c.code}
              type="button"
              className={`cpk-option ${c.code === value ? 'active' : ''}`}
              onClick={() => handleSelect(c)}
            >
              <span className="cpk-option-flag">{c.flagEmoji}</span>
              <span className="cpk-option-name">{c.name}</span>
              {c.currency && (
                <span className="cpk-option-currency">{c.currency.code}</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="cpk-wrapper">
      <button
        ref={triggerRef}
        type="button"
        className={`cpk-trigger ${open ? 'open' : ''} ${selected ? 'has-value' : ''}`}
        onClick={toggleOpen}
      >
        {selected ? (
          <span className="cpk-selected">
            <span className="cpk-flag">{selected.flagEmoji}</span>
            <span className="cpk-name">{selected.name}</span>
            {selected.currency && (
              <span className="cpk-currency-tag">{selected.currency.code}</span>
            )}
          </span>
        ) : (
          <span className="cpk-placeholder">
            {loading ? (
              <><span className="cpk-mini-spinner" /> Loading...</>
            ) : (
              <><Globe size={15} /> {placeholder}</>
            )}
          </span>
        )}
        <span className="cpk-actions">
          {selected && (
            <span className="cpk-clear" onClick={handleClear} role="button" tabIndex={-1}>
              <X size={14} />
            </span>
          )}
          <ChevronDown size={16} className={`cpk-chevron ${open ? 'rotated' : ''}`} />
        </span>
      </button>

      {dropdown}
    </div>
  );
}
