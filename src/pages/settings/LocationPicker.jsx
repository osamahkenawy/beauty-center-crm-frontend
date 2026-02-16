import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Search, Navigation, Crosshair, Copy, Check } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const pinkIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({ click(e) { onLocationSelect(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function MapCenterUpdater({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

export default function LocationPicker({ latitude, longitude, onLocationSelect, height = 300 }) {
  const defaultCenter = [25.2048, 55.2708];
  const center = latitude && longitude ? [latitude, longitude] : defaultCenter;
  const [searchVal, setSearchVal] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [copied, setCopied] = useState(false);
  const searchTimeout = useRef(null);

  // Live suggestions as user types
  const handleSearchInput = (val) => {
    setSearchVal(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.length < 3) { setSuggestions([]); return; }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5&addressdetails=1`);
        const data = await res.json();
        setSuggestions(data.map(d => ({
          lat: parseFloat(d.lat),
          lng: parseFloat(d.lon),
          name: d.display_name,
          type: d.type,
        })));
      } catch (e) { console.error('Geocoding failed:', e); }
    }, 400);
  };

  const handleSelectSuggestion = (s) => {
    onLocationSelect(s.lat, s.lng, s.name);
    setSearchVal('');
    setSuggestions([]);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchVal || searchVal.length < 3) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchVal)}&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        onLocationSelect(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name);
        setSearchVal('');
        setSuggestions([]);
      }
    } catch (e) { console.error('Geocoding failed:', e); }
    setSearching(false);
  };

  const copyCoords = () => {
    if (!latitude || !longitude) return;
    navigator.clipboard.writeText(`${parseFloat(latitude).toFixed(6)}, ${parseFloat(longitude).toFixed(6)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => onLocationSelect(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { enableHighAccuracy: true }
      );
    }
  };

  return (
    <div className="loc-picker">
      {/* Search bar */}
      <form className="loc-search" onSubmit={handleSearchSubmit}>
        <div className="loc-search-inner">
          <Search size={16} className="loc-search-icon" />
          <input
            type="text"
            placeholder="Search for an address or place..."
            value={searchVal}
            onChange={e => handleSearchInput(e.target.value)}
            className="loc-search-input"
          />
          {searching && <div className="loc-search-spinner" />}
          <button type="button" className="loc-myloc-btn" onClick={handleMyLocation} title="Use my location">
            <Crosshair size={16} />
          </button>
        </div>
        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="loc-suggestions">
            {suggestions.map((s, i) => (
              <button key={i} className="loc-suggestion-item" type="button" onClick={() => handleSelectSuggestion(s)}>
                <MapPin size={14} className="loc-sug-icon" />
                <span className="loc-sug-text">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Map */}
      <div className="loc-map-container" style={{ height }}>
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={(lat, lng) => onLocationSelect(lat, lng)} />
          <MapCenterUpdater center={center} />
          {latitude && longitude && <Marker position={[latitude, longitude]} icon={pinkIcon} />}
        </MapContainer>
        {/* Floating zoom */}
        <div className="loc-map-overlay">
          <span className="loc-map-hint">Click anywhere on the map to set location</span>
        </div>
      </div>

      {/* Coordinates footer */}
      {latitude && longitude && (
        <div className="loc-coords-bar">
          <div className="loc-coords-left">
            <Navigation size={13} />
            <span className="loc-coords-val">{parseFloat(latitude).toFixed(6)}</span>
            <span className="loc-coords-sep">,</span>
            <span className="loc-coords-val">{parseFloat(longitude).toFixed(6)}</span>
          </div>
          <button className="loc-copy-btn" onClick={copyCoords} title="Copy coordinates">
            {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
          </button>
        </div>
      )}
    </div>
  );
}
