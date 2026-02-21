import { useEffect, useState } from 'react';
import { Save, FileText } from 'lucide-react';

export default function TermsConditionsSettings({ api, showToast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settingsData, setSettingsData] = useState({});
  const [terms, setTerms] = useState('');

  useEffect(() => {
    const loadTenantSettings = async () => {
      setLoading(true);
      try {
        const response = await api.get('/tenants/current');
        if (response?.success && response?.data) {
          const rawSettings = response.data.settings;
          let parsedSettings = {};

          if (rawSettings) {
            try {
              parsedSettings = typeof rawSettings === 'string'
                ? JSON.parse(rawSettings)
                : rawSettings;
            } catch (error) {
              parsedSettings = {};
            }
          }

          setSettingsData(parsedSettings);
          setTerms(parsedSettings.terms_and_conditions || parsedSettings.terms_conditions || '');
        }
      } catch (error) {
        showToast('error', 'Failed to load terms and conditions settings');
      } finally {
        setLoading(false);
      }
    };

    loadTenantSettings();
  }, [api, showToast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const normalizedTerms = terms.trim();
      const updatedSettings = {
        ...settingsData,
        terms_and_conditions: normalizedTerms,
      };

      const response = await api.patch('/tenants/current', {
        settings: updatedSettings,
      });

      if (!response?.success) {
        throw new Error(response?.message || 'Save failed');
      }

      setSettingsData(updatedSettings);
      showToast('success', 'Terms and conditions saved');
    } catch (error) {
      showToast('error', 'Failed to save terms and conditions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="stn-page">
        <div className="stn-empty">
          <div className="stn-empty-icon">⏳</div>
          <h3>Loading Terms & Conditions</h3>
          <p>Please wait while we load your current settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stn-page">
      <div className="stn-page-actions">
        <button className="stn-btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      <p className="stn-desc">
        Add the terms and conditions shown to clients for bookings, invoices, and receipts.
      </p>

      <div className="stn-card">
        <div className="stn-card-head">
          <h3><FileText size={16} /> Terms & Conditions</h3>
          <p>Define your business legal and policy text in one place.</p>
        </div>
        <div className="stn-card-body">
          <div className="stn-field full">
            <label htmlFor="terms-and-conditions">Terms content</label>
            <textarea
              id="terms-and-conditions"
              rows={14}
              placeholder="Write your terms and conditions here..."
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
            <p className="stn-hint">
              {terms.length} characters
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
