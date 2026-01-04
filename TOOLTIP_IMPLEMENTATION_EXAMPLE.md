# Tooltip Implementation Example | مثال تطبيق التلميحات

This document shows how to add comprehensive tooltips to existing components.

## Before: Without Tooltips | قبل: بدون تلميحات

```jsx
function AccountsPage() {
  const { t } = useTranslation();
  
  return (
    <div className="accounts-page">
      <div className="page-header">
        <h2>{t('accounts.title')}</h2>
        <button className="btn-create" onClick={openCreateModal}>
          <Plus width={18} height={18} />
          <span>{t('accounts.newAccount')}</span>
        </button>
      </div>
      
      <div className="filters-bar">
        <input
          type="text"
          placeholder={t('accounts.searchAccounts')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={fetchAccounts}>
          <Refresh width={18} height={18} />
        </button>
        <button onClick={exportData}>
          <Export width={18} height={18} />
        </button>
      </div>
      
      <table>
        <tbody>
          {accounts.map(account => (
            <tr key={account.id}>
              <td>{account.name}</td>
              <td>
                <button onClick={() => viewAccount(account)}>
                  <Eye width={20} height={20} />
                </button>
                <button onClick={() => editAccount(account)}>
                  <EditPencil width={20} height={20} />
                </button>
                <button onClick={() => deleteAccount(account)}>
                  <Trash width={20} height={20} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## After: With Comprehensive Tooltips | بعد: مع تلميحات شاملة

```jsx
import { useTranslation } from 'react-i18next';
import Tooltip from '../components/Tooltip';
import { Plus, Refresh, Export, Eye, EditPencil, Trash, Filter } from 'iconoir-react';

function AccountsPage() {
  const { t } = useTranslation();
  
  return (
    <div className="accounts-page">
      {/* Header with Tooltip */}
      <div className="page-header">
        <Tooltip tooltipKey="accounts" position="right">
          <h2>{t('accounts.title')}</h2>
        </Tooltip>
        
        {/* Create Button with Tooltip */}
        <Tooltip tooltipKey="newAccount">
          <button className="btn-create" onClick={openCreateModal}>
            <Plus width={18} height={18} />
            <span>{t('accounts.newAccount')}</span>
          </button>
        </Tooltip>
      </div>
      
      {/* Filters with Tooltips */}
      <div className="filters-bar">
        {/* Search Input with Tooltip */}
        <Tooltip tooltipKey="search" position="top">
          <div className="search-box">
            <input
              type="text"
              placeholder={t('accounts.searchAccounts')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </Tooltip>
        
        {/* Refresh Button with Tooltip */}
        <Tooltip tooltipKey="refresh">
          <button className="btn-icon" onClick={fetchAccounts}>
            <Refresh width={18} height={18} />
          </button>
        </Tooltip>
        
        {/* Export Button with Tooltip */}
        <Tooltip tooltipKey="export">
          <button className="btn-icon" onClick={exportData}>
            <Export width={18} height={18} />
          </button>
        </Tooltip>
        
        {/* Filter Button with Tooltip */}
        <Tooltip tooltipKey="filter">
          <button className="btn-icon" onClick={toggleFilters}>
            <Filter width={18} height={18} />
          </button>
        </Tooltip>
      </div>
      
      {/* Table with Action Tooltips */}
      <table className="data-table">
        <thead>
          <tr>
            <th>{t('common.name')}</th>
            <th>{t('common.industry')}</th>
            <th>{t('common.status')}</th>
            <th>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map(account => (
            <tr key={account.id}>
              <td>{account.name}</td>
              <td>{account.industry}</td>
              <td>
                <span className={`status-badge ${account.status}`}>
                  {t(`common.${account.status}`)}
                </span>
              </td>
              <td>
                <div className="action-buttons">
                  {/* View Button with Tooltip */}
                  <Tooltip tooltipKey="viewAccount">
                    <button 
                      className="action-btn view"
                      onClick={() => viewAccount(account)}
                    >
                      <Eye width={20} height={20} />
                    </button>
                  </Tooltip>
                  
                  {/* Edit Button with Tooltip */}
                  <Tooltip tooltipKey="editAccount">
                    <button 
                      className="action-btn edit"
                      onClick={() => editAccount(account)}
                    >
                      <EditPencil width={20} height={20} />
                    </button>
                  </Tooltip>
                  
                  {/* Delete Button with Tooltip */}
                  <Tooltip tooltipKey="deleteAccount">
                    <button 
                      className="action-btn delete"
                      onClick={() => deleteAccount(account)}
                    >
                      <Trash width={20} height={20} />
                    </button>
                  </Tooltip>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## Form Example with Field Tooltips | مثال النموذج مع تلميحات الحقول

```jsx
import { useTranslation } from 'react-i18next';
import Tooltip from '../components/Tooltip';
import { Building, Globe, Phone, Mail, MapPin } from 'iconoir-react';

function AccountForm({ account, onSubmit, onCancel }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState(account || {});
  
  return (
    <form onSubmit={onSubmit}>
      <div className="modal-body">
        {/* Account Name Field with Tooltip */}
        <div className="form-group">
          <label className="form-label">
            <Building width={14} height={14} />
            <Tooltip tooltipKey="accountName" position="right">
              <span>{t('accounts.accountName')} *</span>
            </Tooltip>
          </label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.name || ''}
            onChange={(e) => setFormData({...formData, name: e.target.value})} 
            placeholder={t('accounts.accountName')}
            required 
          />
        </div>
        
        {/* Industry Field with Tooltip */}
        <div className="form-group">
          <label className="form-label">
            <Tooltip tooltipKey="industry" position="right">
              <span>{t('common.industry')}</span>
            </Tooltip>
          </label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.industry || ''}
            onChange={(e) => setFormData({...formData, industry: e.target.value})}
            placeholder={t('common.industry')}
          />
        </div>
        
        {/* Website Field with Tooltip */}
        <div className="form-group">
          <label className="form-label">
            <Globe width={14} height={14} />
            <Tooltip tooltipKey="website" position="right">
              <span>{t('common.website')}</span>
            </Tooltip>
          </label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.website || ''}
            onChange={(e) => setFormData({...formData, website: e.target.value})}
            placeholder="www.example.com"
          />
        </div>
        
        {/* Phone Field with Tooltip */}
        <div className="form-group">
          <label className="form-label">
            <Phone width={14} height={14} />
            <Tooltip tooltipKey="phone" position="right">
              <span>{t('common.phone')}</span>
            </Tooltip>
          </label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.phone || ''}
            onChange={(e) => setFormData({...formData, phone: e.target.value})}
            placeholder="+971 50 123 4567"
          />
        </div>
        
        {/* Email Field with Tooltip */}
        <div className="form-group">
          <label className="form-label">
            <Mail width={14} height={14} />
            <Tooltip tooltipKey="email" position="right">
              <span>{t('common.email')}</span>
            </Tooltip>
          </label>
          <input 
            type="email" 
            className="form-input" 
            value={formData.email || ''}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="contact@example.com"
          />
        </div>
        
        {/* Address Field with Tooltip */}
        <div className="form-group">
          <label className="form-label">
            <MapPin width={14} height={14} />
            <Tooltip tooltipKey="address" position="right">
              <span>{t('common.address')}</span>
            </Tooltip>
          </label>
          <input 
            type="text" 
            className="form-input" 
            value={formData.address || ''}
            onChange={(e) => setFormData({...formData, address: e.target.value})}
            placeholder={t('common.address')}
          />
        </div>
      </div>
      
      {/* Form Actions with Tooltips */}
      <div className="modal-footer">
        <Tooltip tooltipKey="cancel">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </Tooltip>
        
        <Tooltip tooltipKey="save">
          <button type="submit" className="btn-primary">
            {t('common.save')}
          </button>
        </Tooltip>
      </div>
    </form>
  );
}
```

## Dashboard Stats with Tooltips | إحصائيات لوحة التحكم مع التلميحات

```jsx
import { useTranslation } from 'react-i18next';
import Tooltip from '../components/Tooltip';
import { Flash, Wallet, Trophy, User } from 'iconoir-react';

function DashboardStats({ stats }) {
  const { t } = useTranslation();
  
  return (
    <div className="stats-grid">
      {/* Total Leads Card with Tooltip */}
      <Tooltip tooltipKey="totalLeads" position="top">
        <div className="stat-card primary">
          <div className="stat-icon">
            <Flash width={24} height={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.leads.total}</span>
            <span className="stat-label">{t('leads.totalLeads')}</span>
          </div>
        </div>
      </Tooltip>
      
      {/* Open Deals Card with Tooltip */}
      <Tooltip tooltipKey="openDeals" position="top">
        <div className="stat-card secondary">
          <div className="stat-icon">
            <Wallet width={24} height={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.deals.open}</span>
            <span className="stat-label">{t('deals.openDeals')}</span>
          </div>
        </div>
      </Tooltip>
      
      {/* Won Revenue Card with Tooltip */}
      <Tooltip tooltipKey="wonRevenue" position="top">
        <div className="stat-card success">
          <div className="stat-icon">
            <Trophy width={24} height={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(stats.deals.wonValue)}</span>
            <span className="stat-label">{t('deals.wonRevenue')}</span>
          </div>
        </div>
      </Tooltip>
      
      {/* Total Contacts Card with Tooltip */}
      <Tooltip tooltipKey="totalContacts" position="top">
        <div className="stat-card info">
          <div className="stat-icon">
            <User width={24} height={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.contacts.total}</span>
            <span className="stat-label">{t('contacts.totalContacts')}</span>
          </div>
        </div>
      </Tooltip>
    </div>
  );
}
```

## Navigation Menu with Tooltips | قائمة التنقل مع التلميحات

```jsx
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import Tooltip from '../components/Tooltip';
import {
  HomeSimple, Mail, Building, User, Flash, Wallet,
  ViewColumns3, List, Calendar
} from 'iconoir-react';

function NavigationMenu() {
  const { t } = useTranslation();
  const location = useLocation();
  
  const menuItems = [
    { path: '/dashboard', icon: HomeSimple, labelKey: 'common.dashboard', tooltipKey: 'dashboard' },
    { path: '/inbox', icon: Mail, labelKey: 'common.inbox', tooltipKey: 'inbox' },
    { path: '/accounts', icon: Building, labelKey: 'common.accounts', tooltipKey: 'accounts' },
    { path: '/contacts', icon: User, labelKey: 'common.contacts', tooltipKey: 'contacts' },
    { path: '/leads', icon: Flash, labelKey: 'common.leads', tooltipKey: 'leads' },
    { path: '/deals', icon: Wallet, labelKey: 'common.deals', tooltipKey: 'deals' },
    { path: '/pipelines', icon: ViewColumns3, labelKey: 'common.pipelines', tooltipKey: 'pipelines' },
    { path: '/activities', icon: List, labelKey: 'common.activities', tooltipKey: 'activities' },
    { path: '/calendar', icon: Calendar, labelKey: 'common.calendar', tooltipKey: 'calendar' },
  ];
  
  return (
    <nav className="sidebar-nav">
      <ul>
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <li key={item.path}>
              <Tooltip tooltipKey={item.tooltipKey} position="right">
                <Link 
                  to={item.path} 
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon width={20} height={20} />
                  <span>{t(item.labelKey)}</span>
                </Link>
              </Tooltip>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

## Alternative: HTML Title Attribute Method | البديل: طريقة خاصية العنوان HTML

If you prefer not to use the Tooltip component, you can use the HTML `title` attribute:

```jsx
function SimpleTooltipExample() {
  const { t } = useTranslation();
  
  return (
    <div>
      {/* Button with simple tooltip */}
      <button 
        className="btn-primary" 
        title={t('tooltips.create')}
        onClick={handleCreate}
      >
        <Plus width={18} height={18} />
        {t('common.create')}
      </button>
      
      {/* Icon button with tooltip */}
      <button 
        className="btn-icon" 
        title={t('tooltips.refresh')}
        onClick={handleRefresh}
      >
        <Refresh width={20} height={20} />
      </button>
      
      {/* Link with tooltip */}
      <a 
        href="/help" 
        title={t('tooltips.help')}
      >
        <InfoCircle width={16} height={16} />
      </a>
    </div>
  );
}
```

## Summary of Changes | ملخص التغييرات

### What Was Added | ما تمت إضافته

1. ✅ Imported `Tooltip` component
2. ✅ Wrapped interactive elements with `<Tooltip>`
3. ✅ Added `tooltipKey` prop to each tooltip
4. ✅ Set appropriate `position` (top, bottom, left, right)
5. ✅ Used translation keys for all text

### Benefits | الفوائد

- 🎯 **Better UX** - Users understand what each button does
- 🌍 **Multilingual** - Tooltips work in both English and Arabic
- 🎨 **Consistent** - All tooltips use the same styling
- ♿ **Accessible** - Works with screen readers and keyboard navigation
- 📱 **Responsive** - Tooltips adapt to screen size

### Tips for Implementation | نصائح للتنفيذ

1. **Start with Action Buttons** - Add tooltips to create, edit, delete buttons first
2. **Add to Navigation** - Help users understand each menu item
3. **Include in Forms** - Explain what each field is for
4. **Stats and Metrics** - Clarify what numbers represent
5. **Icons Without Text** - Always add tooltips to icon-only buttons

---

## Complete Page Example | مثال صفحة كاملة

See the complete implementation in:
- `/src/pages/AccountsWithTooltips.jsx` (example file)
- `/src/components/Tooltip.jsx` (tooltip component)
- `/src/i18n/locales/ar.json` (Arabic translations)
- `/src/i18n/locales/en.json` (English translations)

راجع التنفيذ الكامل في:
- `/src/pages/AccountsWithTooltips.jsx` (ملف مثال)
- `/src/components/Tooltip.jsx` (مكون التلميح)
- `/src/i18n/locales/ar.json` (الترجمات العربية)
- `/src/i18n/locales/en.json` (الترجمات الإنجليزية)

