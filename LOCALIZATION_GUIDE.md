# دليل التوطين الشامل | Comprehensive Localization Guide

## Overview | نظرة عامة

This CRM system now includes **comprehensive Arabic and English localization** with complete tooltip support for all features.

يتضمن نظام CRM هذا الآن **توطين عربي وإنجليزي شامل** مع دعم كامل للتلميحات لجميع الميزات.

---

## Features | الميزات

### 1. Complete Translation Coverage | تغطية الترجمة الكاملة

✅ **All Pages Translated** | جميع الصفحات مترجمة:
- Dashboard | لوحة التحكم
- Accounts | الحسابات
- Contacts | جهات الاتصال  
- Leads | العملاء المحتملون
- Deals | الصفقات
- Pipelines | خطوط الأنابيب
- Activities | الأنشطة
- Calendar | التقويم
- Notes | الملاحظات
- Tags | العلامات
- Products | المنتجات
- Quotes | عروض الأسعار
- Documents | المستندات
- Campaigns | الحملات
- Audiences | الجماهير
- Email Templates | قوالب البريد الإلكتروني
- Integrations | التكاملات
- Branches | الفروع
- Custom Fields | الحقول المخصصة
- Workflows | سير العمل
- Reports | التقارير
- Audit Logs | سجلات التدقيق

### 2. Comprehensive Tooltips | تلميحات شاملة

✅ **All UI Elements Have Tooltips** | جميع عناصر الواجهة لها تلميحات:
- Buttons | الأزرار
- Icons | الأيقونات
- Form Fields | حقول النموذج
- Navigation Items | عناصر التنقل
- Action Buttons | أزرار الإجراءات
- Status Indicators | مؤشرات الحالة

### 3. RTL Support | دعم الاتجاه من اليمين إلى اليسار

✅ **Full RTL Layout for Arabic** | تخطيط RTL كامل للعربية:
- Automatic direction switching
- Mirrored layouts
- Proper text alignment
- Flipped icons where needed

---

## Usage Guide | دليل الاستخدام

### Importing Translations | استيراد الترجمات

```javascript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.welcome')}</p>
    </div>
  );
}
```

### Using Tooltips | استخدام التلميحات

#### Method 1: Using the Tooltip Component | الطريقة الأولى: استخدام مكون التلميح

```javascript
import Tooltip from '../components/Tooltip';

function MyButton() {
  return (
    <Tooltip tooltipKey="create" position="top">
      <button className="btn-primary">
        <Plus width={18} height={18} />
        {t('common.create')}
      </button>
    </Tooltip>
  );
}
```

#### Method 2: Using HTML Title Attribute | الطريقة الثانية: استخدام خاصية العنوان

```javascript
function MyButton() {
  const { t } = useTranslation();
  
  return (
    <button 
      className="btn-primary" 
      title={t('tooltips.create')}
    >
      <Plus width={18} height={18} />
      {t('common.create')}
    </button>
  );
}
```

### Language Switching | تبديل اللغة

```javascript
import { useTranslation } from 'react-i18next';

function LanguageSwitcher() {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };
  
  return (
    <div>
      <button onClick={() => changeLanguage('en')}>English</button>
      <button onClick={() => changeLanguage('ar')}>العربية</button>
    </div>
  );
}
```

---

## Translation Structure | هيكل الترجمة

### File Structure | هيكل الملفات

```
src/i18n/
├── index.js           # i18n configuration
└── locales/
    ├── en.json        # English translations
    └── ar.json        # Arabic translations
```

### JSON Structure | هيكل JSON

```json
{
  "common": {
    "dashboard": "Dashboard",
    "create": "Create",
    "edit": "Edit"
  },
  "tooltips": {
    "dashboard": "View your main dashboard",
    "create": "Create a new record",
    "edit": "Edit this record"
  },
  "dashboard": {
    "title": "Dashboard",
    "welcome": "Welcome back"
  }
}
```

---

## Tooltip Keys Reference | مرجع مفاتيح التلميحات

### Navigation Tooltips | تلميحات التنقل

| Key | English | Arabic |
|-----|---------|--------|
| `tooltips.dashboard` | View your main dashboard with key metrics | عرض لوحة التحكم الرئيسية مع المقاييس |
| `tooltips.inbox` | Check your messages and communications | تحقق من رسائلك واتصالاتك |
| `tooltips.accounts` | Manage company accounts | إدارة حسابات الشركات |
| `tooltips.contacts` | Manage individual contacts | إدارة جهات الاتصال الفردية |
| `tooltips.leads` | Track and manage potential customers | تتبع وإدارة العملاء المحتملين |
| `tooltips.deals` | Manage sales opportunities | إدارة فرص المبيعات |

### Action Tooltips | تلميحات الإجراءات

| Key | English | Arabic |
|-----|---------|--------|
| `tooltips.create` | Create a new record | إنشاء سجل جديد |
| `tooltips.edit` | Edit this record | تحرير هذا السجل |
| `tooltips.delete` | Delete this record | حذف هذا السجل |
| `tooltips.save` | Save changes | حفظ التغييرات |
| `tooltips.cancel` | Cancel and discard changes | إلغاء وتجاهل التغييرات |
| `tooltips.view` | View full details | عرض التفاصيل الكاملة |
| `tooltips.filter` | Filter the list | تصفية القائمة |
| `tooltips.search` | Search records | البحث في السجلات |
| `tooltips.export` | Export data to file | تصدير البيانات إلى ملف |
| `tooltips.import` | Import data from file | استيراد البيانات من ملف |
| `tooltips.refresh` | Refresh data | تحديث البيانات |

### Feature-Specific Tooltips | تلميحات خاصة بالميزات

| Key | English | Arabic |
|-----|---------|--------|
| `tooltips.newLead` | Create a new lead | إنشاء عميل محتمل جديد |
| `tooltips.newDeal` | Create a new deal | إنشاء صفقة جديدة |
| `tooltips.newContact` | Create a new contact | إنشاء جهة اتصال جديدة |
| `tooltips.convertLead` | Convert lead to contact/deal | تحويل العميل إلى جهة اتصال/صفقة |
| `tooltips.qualifyLead` | Mark lead as qualified | وضع علامة على العميل كمؤهل |
| `tooltips.assignTo` | Assign to team member | تعيين لعضو في الفريق |
| `tooltips.changeStatus` | Change status | تغيير الحالة |
| `tooltips.addTag` | Add a tag | إضافة علامة |
| `tooltips.attachFile` | Attach a file | إرفاق ملف |
| `tooltips.sendEmail` | Send an email | إرسال بريد إلكتروني |

---

## Implementation Examples | أمثلة التنفيذ

### Example 1: Dashboard with Tooltips | مثال 1: لوحة التحكم مع التلميحات

```jsx
import { useTranslation } from 'react-i18next';
import Tooltip from '../components/Tooltip';
import { Plus, Refresh, Filter } from 'iconoir-react';

function Dashboard() {
  const { t } = useTranslation();
  
  return (
    <div className="dashboard">
      <div className="header-actions">
        <Tooltip tooltipKey="newLead">
          <button className="btn-primary">
            <Plus width={18} height={18} />
            {t('dashboard.newLead')}
          </button>
        </Tooltip>
        
        <Tooltip tooltipKey="refresh">
          <button className="btn-icon">
            <Refresh width={20} height={20} />
          </button>
        </Tooltip>
        
        <Tooltip tooltipKey="filter">
          <button className="btn-icon">
            <Filter width={20} height={20} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
```

### Example 2: Table with Action Tooltips | مثال 2: جدول مع تلميحات الإجراءات

```jsx
import { useTranslation } from 'react-i18next';
import { Eye, EditPencil, Trash } from 'iconoir-react';

function AccountsTable({ accounts }) {
  const { t } = useTranslation();
  
  return (
    <table>
      <tbody>
        {accounts.map(account => (
          <tr key={account.id}>
            <td>{account.name}</td>
            <td>
              <div className="action-buttons">
                <button 
                  className="action-btn view"
                  title={t('tooltips.viewAccount')}
                >
                  <Eye width={20} height={20} />
                </button>
                <button 
                  className="action-btn edit"
                  title={t('tooltips.editAccount')}
                >
                  <EditPencil width={20} height={20} />
                </button>
                <button 
                  className="action-btn delete"
                  title={t('tooltips.deleteAccount')}
                >
                  <Trash width={20} height={20} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Example 3: Form with Field Tooltips | مثال 3: نموذج مع تلميحات الحقول

```jsx
import { useTranslation } from 'react-i18next';
import Tooltip from '../components/Tooltip';

function AccountForm() {
  const { t } = useTranslation();
  
  return (
    <form>
      <div className="form-group">
        <label className="form-label">
          <Tooltip tooltipKey="accountName" position="right" icon={true}>
            <span>{t('accounts.accountName')} *</span>
          </Tooltip>
        </label>
        <input 
          type="text" 
          className="form-input"
          placeholder={t('accounts.accountName')}
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">
          <Tooltip tooltipKey="industry" position="right" icon={true}>
            <span>{t('common.industry')}</span>
          </Tooltip>
        </label>
        <input 
          type="text" 
          className="form-input"
          placeholder={t('common.industry')}
        />
      </div>
    </form>
  );
}
```

---

## Best Practices | أفضل الممارسات

### 1. Always Use Translation Keys | استخدم دائماً مفاتيح الترجمة

❌ **Bad:**
```jsx
<button>Create New Lead</button>
```

✅ **Good:**
```jsx
<button>{t('dashboard.newLead')}</button>
```

### 2. Add Tooltips to All Interactive Elements | أضف تلميحات لجميع العناصر التفاعلية

❌ **Bad:**
```jsx
<button className="btn-icon">
  <Plus width={18} height={18} />
</button>
```

✅ **Good:**
```jsx
<Tooltip tooltipKey="create">
  <button className="btn-icon">
    <Plus width={18} height={18} />
  </button>
</Tooltip>
```

### 3. Use Semantic Translation Keys | استخدم مفاتيح ترجمة دلالية

❌ **Bad:**
```jsx
{t('text1')}
{t('button2')}
```

✅ **Good:**
```jsx
{t('dashboard.title')}
{t('common.create')}
```

### 4. Provide Context in Tooltips | قدم سياقاً في التلميحات

❌ **Bad:**
```json
{
  "tooltips": {
    "edit": "Edit"
  }
}
```

✅ **Good:**
```json
{
  "tooltips": {
    "edit": "Edit this record and save changes"
  }
}
```

---

## Testing Localization | اختبار التوطين

### 1. Visual Testing | الاختبار البصري

- Switch between English and Arabic
- Verify RTL layout for Arabic
- Check text alignment
- Verify tooltip positions
- Test on different screen sizes

### 2. Functional Testing | الاختبار الوظيفي

- Verify all text is translated
- Test language switching
- Verify tooltips appear on hover
- Check form validation messages
- Test success/error messages

### 3. Accessibility Testing | اختبار إمكانية الوصول

- Screen reader compatibility
- Keyboard navigation with tooltips
- High contrast mode
- Font size scaling

---

## Adding New Translations | إضافة ترجمات جديدة

### Step 1: Add to English (en.json) | الخطوة 1: إضافة للإنجليزية

```json
{
  "myFeature": {
    "title": "My Feature",
    "description": "Feature description"
  },
  "tooltips": {
    "myFeature": "This is my feature tooltip"
  }
}
```

### Step 2: Add to Arabic (ar.json) | الخطوة 2: إضافة للعربية

```json
{
  "myFeature": {
    "title": "ميزتي",
    "description": "وصف الميزة"
  },
  "tooltips": {
    "myFeature": "هذا تلميح ميزتي"
  }
}
```

### Step 3: Use in Component | الخطوة 3: الاستخدام في المكون

```jsx
import { useTranslation } from 'react-i18next';
import Tooltip from '../components/Tooltip';

function MyFeature() {
  const { t } = useTranslation();
  
  return (
    <div>
      <Tooltip tooltipKey="myFeature">
        <h1>{t('myFeature.title')}</h1>
      </Tooltip>
      <p>{t('myFeature.description')}</p>
    </div>
  );
}
```

---

## Common Translation Keys | مفاتيح الترجمة الشائعة

### General Actions | الإجراءات العامة
- `common.create` - Create
- `common.edit` - Edit
- `common.delete` - Delete
- `common.save` - Save
- `common.cancel` - Cancel
- `common.close` - Close
- `common.view` - View
- `common.search` - Search
- `common.filter` - Filter
- `common.export` - Export
- `common.import` - Import
- `common.refresh` - Refresh

### Status Messages | رسائل الحالة
- `common.loading` - Loading...
- `common.success` - Success
- `common.error` - Error
- `common.warning` - Warning
- `common.noData` - No data found
- `common.noResults` - No results found

### Form Labels | تسميات النموذج
- `common.name` - Name
- `common.email` - Email
- `common.phone` - Phone
- `common.address` - Address
- `common.city` - City
- `common.country` - Country
- `common.description` - Description
- `common.status` - Status
- `common.type` - Type
- `common.category` - Category
- `common.priority` - Priority

---

## Troubleshooting | استكشاف الأخطاء

### Issue: Translations Not Showing | المشكلة: الترجمات لا تظهر

**Solution:**
1. Check that the translation key exists in both `en.json` and `ar.json`
2. Verify the key path is correct (e.g., `dashboard.title` not `dashboard-title`)
3. Restart the development server

### Issue: RTL Layout Not Working | المشكلة: تخطيط RTL لا يعمل

**Solution:**
1. Verify `dir` attribute is set on `<html>` element
2. Check CSS includes RTL-specific rules
3. Verify language is actually switching to 'ar'

### Issue: Tooltips Not Appearing | المشكلة: التلميحات لا تظهر

**Solution:**
1. Check tooltip component is imported correctly
2. Verify `tooltipKey` exists in `tooltips` section
3. Check CSS for `.tooltip-bubble` class
4. Verify z-index is high enough

---

## Support | الدعم

For questions or issues with localization:
- Check this guide first
- Review the example components
- Check the translation JSON files
- Test in both languages

للأسئلة أو المشكلات المتعلقة بالتوطين:
- تحقق من هذا الدليل أولاً
- راجع مكونات الأمثلة
- تحقق من ملفات JSON للترجمة
- اختبر في كلا اللغتين

---

## Conclusion | الخلاصة

This CRM system now has **comprehensive localization** with:
- ✅ Complete Arabic and English translations
- ✅ Full tooltip support for all features
- ✅ RTL layout for Arabic
- ✅ Easy-to-use translation components
- ✅ Extensible translation structure

يحتوي نظام CRM هذا الآن على **توطين شامل** مع:
- ✅ ترجمات عربية وإنجليزية كاملة
- ✅ دعم كامل للتلميحات لجميع الميزات
- ✅ تخطيط RTL للعربية
- ✅ مكونات ترجمة سهلة الاستخدام
- ✅ بنية ترجمة قابلة للتوسع


