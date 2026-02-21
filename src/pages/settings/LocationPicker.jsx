import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl, useMapEvents, useMap } from 'react-leaflet';
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

const branchIcon = new L.DivIcon({
  className: 'loc-branch-marker',
  html: '<span class="loc-branch-marker-dot"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const hqIcon = new L.DivIcon({
  className: 'loc-branch-marker hq',
  html: '<span class="loc-branch-marker-dot"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
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

async function geocodeWithMapbox(query, limit = 5) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token) return [];

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&autocomplete=true&types=place,address,poi,locality,neighborhood,postcode,region,country&limit=${limit}`;
  const res = await fetch(url);
  const data = await res.json();

  return (data?.features || []).map((feature) => ({
    lat: feature.center?.[1],
    lng: feature.center?.[0],
    name: feature.place_name,
    type: feature.place_type?.[0] || 'place',
  })).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}

async function geocodeWithNominatim(query, limit = 5) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=1`);
  const data = await res.json();

  return (data || []).map((d) => ({
    lat: parseFloat(d.lat),
    lng: parseFloat(d.lon),
    name: d.display_name,
    type: d.type,
  })).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}

async function geocodeLocations(query, limit = 5) {
  try {
    const mapbox = await geocodeWithMapbox(query, limit);
    if (mapbox.length > 0) return mapbox;
  } catch (e) {
    /* fallback below */
  }

  try {
    return await geocodeWithNominatim(query, limit);
  } catch (e) {
    return [];
  }
}

export default function LocationPicker({ latitude, longitude, onLocationSelect, height = 300, markers = [] }) {
  const defaultCenter = [25.2048, 55.2708];
  const center = latitude && longitude ? [latitude, longitude] : defaultCenter;
  const [searchVal, setSearchVal] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [copied, setCopied] = useState(false);
  const searchTimeout = useRef(null);

  // Live suggestions as user types
  const handleSearchInput = (val) => {
    setSearchVal(val);
    setSearchError('');
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (val.length < 3) {
      setSearching(false);
      setSearched(false);
      setSuggestions([]);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const results = await geocodeLocations(val, 6);
        setSuggestions(results);
        setSearched(true);
        if (!results.length) setSearchError('No locations found. Try a more specific address.');
      } catch (e) {
        console.error('Geocoding failed:', e);
        setSearched(true);
        setSearchError('Search failed. Please try again.');
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleSelectSuggestion = (s) => {
    onLocationSelect(s.lat, s.lng, s.name);
    setSearchVal('');
    setSearchError('');
    setSearched(false);
    setSuggestions([]);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchVal || searchVal.length < 3) return;
    setSearching(true);
    setSearchError('');
    try {
      const results = await geocodeLocations(searchVal, 1);
      if (results.length > 0) {
        onLocationSelect(results[0].lat, results[0].lng, results[0].name);
        setSearchVal('');
        setSearched(false);
        setSuggestions([]);
      } else {
        setSearched(true);
        setSearchError('No locations found. Try another search term.');
      }
    } catch (e) {
      console.error('Geocoding failed:', e);
      setSearched(true);
      setSearchError('Search failed. Please try again.');
    }
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
        {(searching || suggestions.length > 0 || (searched && !!searchError)) && (
          <div className="loc-suggestions">
            {searching && <div className="loc-suggestion-state">Searching locations…</div>}
            {suggestions.map((s, i) => (
              <button key={i} className="loc-suggestion-item" type="button" onClick={() => handleSelectSuggestion(s)}>
                <MapPin size={14} className="loc-sug-icon" />
                <span className="loc-sug-text">{s.name}</span>
              </button>
            ))}
            {!searching && searched && suggestions.length === 0 && searchError && (
              <div className="loc-suggestion-state">{searchError}</div>
            )}
          </div>
        )}
      </form>

      {/* Map */}
      <div className="loc-map-container" style={{ height }}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          attributionControl={false}
          zoomControl={false}
          dragging={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          touchZoom={true}
          keyboard={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="topright" />
          <MapClickHandler onLocationSelect={(lat, lng) => onLocationSelect(lat, lng)} />
          <MapCenterUpdater center={center} />

          {markers.map((marker) => (
            <Marker
              key={marker.id || `${marker.lat}-${marker.lng}-${marker.label || 'branch'}`}
              position={[marker.lat, marker.lng]}
              icon={marker.isHeadquarters ? hqIcon : branchIcon}
            >
              <Popup>
                <div className="loc-branch-popup">
                  <strong>{marker.label || 'Branch'}</strong>
                  <span className={`loc-branch-popup-status ${marker.isActive ? 'open' : 'closed'}`}>
                    {marker.isHeadquarters ? 'HQ • ' : ''}{marker.isActive ? 'Open' : 'Closed'}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}

          {latitude && longitude && (
            <Marker
              position={[latitude, longitude]}
              icon={pinkIcon}
              draggable={true}
              eventHandlers={{
                dragend: (event) => {
                  const marker = event.target;
                  const pos = marker.getLatLng();
                  onLocationSelect(pos.lat, pos.lng);
                }
              }}
            />
          )}
        </MapContainer>
        {/* Floating zoom */}
        <div className="loc-map-overlay">
          <span className="loc-map-hint">Click to drop pin • Drag pin or map to adjust</span>
        </div>
        <div className="loc-map-brand">trasealla.com</div>
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
