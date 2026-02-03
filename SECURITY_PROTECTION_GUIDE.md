# 🔒 Security Protection Guide

This guide explains the client-side security protections implemented in the CRM application.

## ⚠️ Important Disclaimer

**These protections are CLIENT-SIDE deterrents only.** They cannot completely prevent determined users from:
- Taking screenshots (OS-level tools, phone cameras)
- Opening DevTools (browser extensions, alternative methods)
- Inspecting network traffic
- Copying data

### Real Security Measures

For true security, always implement:

1. ✅ **Server-side validation** - Never trust client data
2. ✅ **Proper authentication & authorization** - JWT tokens, role-based access
3. ✅ **Data encryption** - HTTPS, database encryption
4. ✅ **Audit logging** - Track all data access
5. ✅ **Rate limiting** - Prevent bulk data extraction
6. ✅ **IP whitelisting** - Restrict access by location
7. ✅ **Two-factor authentication** - Add extra security layer

## 🛡️ Implemented Protections

### 1. Right-Click Context Menu Disabled
- Prevents casual users from accessing "Inspect Element"
- Shows security warning when attempted

### 2. DevTools Keyboard Shortcuts Blocked
Blocked shortcuts:
- `F12` - Open DevTools
- `Ctrl+Shift+I` / `Cmd+Option+I` - Open DevTools
- `Ctrl+Shift+J` / `Cmd+Option+J` - Open Console
- `Ctrl+Shift+C` / `Cmd+Option+C` - Inspect Element
- `Ctrl+U` - View Page Source
- `PrintScreen` - Screenshot (shows warning only)

### 3. DevTools Detection
- Monitors if DevTools is open
- Shows security warning
- Can log events to backend

### 4. Text Selection Control (Optional)
- Prevents text selection on sensitive pages
- Can be enabled per page or globally

### 5. Copy/Paste Protection (Optional)
- Blocks copy and cut operations
- Can be enabled for specific content

### 6. Watermark Overlay (Optional)
- Adds "CONFIDENTIAL" watermark
- Makes screenshots less useful

### 7. Security Warnings
- Visual notifications when protections trigger
- Console warnings for developers

## 📦 Files Created

```
crm-frontend/
├── src/
│   ├── utils/
│   │   ├── securityProtection.js    # Core security functions
│   │   └── securityConfig.js        # Configuration settings
│   └── hooks/
│       └── useSecurityProtection.js # React hook for easy integration
```

## 🚀 Usage

### Basic Implementation (Already Added to App.jsx)

```jsx
import useSecurityProtection from './hooks/useSecurityProtection';

function App() {
  const [user, setUser] = useState(null);
  
  // Activate security protections for logged-in users
  useSecurityProtection({
    disableRightClickMenu: !!user,
    disableKeyboardShortcuts: !!user,
    detectDevToolsOpen: !!user,
    disableSelection: false,
    disableCopyPasteOperations: false,
    showWatermark: false,
    watermarkText: 'CONFIDENTIAL',
    onDevToolsOpen: (isOpen) => {
      if (isOpen && user) {
        console.warn('Security Alert: DevTools opened');
      }
    }
  });
  
  return <div>Your App</div>;
}
```

### Advanced: Per-Page Configuration

```jsx
import { useLocation } from 'react-router-dom';
import useSecurityProtection from './hooks/useSecurityProtection';

function ProtectedPage() {
  const location = useLocation();
  const isStrictPage = ['/reports', '/audit-logs'].includes(location.pathname);
  
  useSecurityProtection({
    disableRightClickMenu: true,
    disableKeyboardShortcuts: true,
    detectDevToolsOpen: true,
    disableSelection: isStrictPage,        // Only on strict pages
    showWatermark: isStrictPage,           // Only on strict pages
    watermarkText: 'CONFIDENTIAL - REPORTS'
  });
  
  return <div>Protected content</div>;
}
```

### Manual Control

```jsx
import { 
  disableRightClick,
  disableDevToolsShortcuts,
  detectDevTools,
  addWatermark,
  showSecurityWarning 
} from './utils/securityProtection';

// Enable specific protection
useEffect(() => {
  disableRightClick();
  disableDevToolsShortcuts();
  
  detectDevTools((isOpen) => {
    if (isOpen) {
      showSecurityWarning('DevTools detected!');
      // Log to backend
      logSecurityEvent({ type: 'devtools_opened' });
    }
  });
  
  // Add watermark on sensitive pages
  if (isSensitivePage) {
    addWatermark('CONFIDENTIAL');
  }
}, []);
```

## ⚙️ Configuration

Edit `src/utils/securityConfig.js` to customize settings:

```javascript
export const securityConfig = {
  enabled: true,                      // Master switch
  disableRightClick: true,            // Disable right-click menu
  disableDevToolsShortcuts: true,     // Disable keyboard shortcuts
  detectDevTools: true,               // Monitor for DevTools
  disableTextSelection: false,        // Disable text selection
  disableCopyPaste: false,            // Disable copy/paste
  showWatermark: false,               // Show watermark overlay
  watermarkText: 'CONFIDENTIAL',      // Watermark text
  
  // Pages requiring strict security
  strictSecurityPages: [
    '/dashboard',
    '/reports',
    '/audit-logs',
    '/contacts',
    '/leads'
  ]
};
```

## 🎨 Customizing Warnings

The security warnings are fully customizable. Edit the `showSecurityWarning` function in `securityProtection.js`:

```javascript
export const showSecurityWarning = (message) => {
  // Customize appearance, duration, position, etc.
  const overlay = document.createElement('div');
  overlay.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4757;
      color: white;
      padding: 16px;
      border-radius: 12px;
      z-index: 999999;
    ">${message}</div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 3000);
};
```

## 📊 Logging Security Events

To track security events, integrate with your backend:

```javascript
// In securityProtection.js or your API layer
const logSecurityEvent = async (event) => {
  try {
    const token = localStorage.getItem('crm_token');
    await fetch('/api/security/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        event: event.type,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        ...event
      })
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};

// Use in callbacks
onDevToolsOpen: (isOpen) => {
  if (isOpen) {
    logSecurityEvent({ 
      type: 'devtools_opened',
      page: window.location.pathname 
    });
  }
}
```

## 🧪 Testing

To verify the protections are working:

1. **Right-Click Test**
   - Try right-clicking anywhere on the page
   - Should see security warning

2. **DevTools Shortcuts Test**
   - Try pressing F12, Ctrl+Shift+I, etc.
   - Should be blocked with warning

3. **DevTools Detection Test**
   - Open DevTools using alternative method (browser menu)
   - Should see detection warning in console

4. **Copy/Paste Test** (if enabled)
   - Try selecting and copying text
   - Should be blocked with warning

## 🔧 Disabling Protections

### Temporarily (for development)

In `App.jsx`, set conditions:

```jsx
const isDevelopment = import.meta.env.DEV;

useSecurityProtection({
  disableRightClickMenu: !isDevelopment && !!user,
  disableKeyboardShortcuts: !isDevelopment && !!user,
  detectDevToolsOpen: !isDevelopment && !!user,
});
```

### Permanently

In `securityConfig.js`:

```javascript
export const securityConfig = {
  enabled: false,  // Disable all protections
  // ... rest of config
};
```

Or remove the hook call from `App.jsx`.

## 📱 Mobile Considerations

Some protections may not work or are unnecessary on mobile:
- DevTools shortcuts (no keyboard)
- Right-click menu (no right-click)
- Screenshot prevention (OS-level on mobile)

Consider detecting mobile and adjusting:

```jsx
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

useSecurityProtection({
  disableRightClickMenu: !isMobile && !!user,
  disableKeyboardShortcuts: !isMobile && !!user,
  detectDevToolsOpen: !isMobile && !!user,
});
```

## 🚨 Known Limitations

1. **Cannot prevent screenshots** - OS-level tools bypass browser
2. **Cannot fully block DevTools** - Accessible through browser menu
3. **Can be bypassed** - Browser extensions, modified browsers
4. **May hurt UX** - Disabled selection/copy affects legitimate users
5. **Not foolproof** - Determined attackers will find ways around

## 💡 Best Practices

1. ✅ Use protections as **deterrents**, not primary security
2. ✅ Enable stricter protections only on **sensitive pages**
3. ✅ **Log security events** to backend for monitoring
4. ✅ **Don't rely solely** on client-side protection
5. ✅ **Test thoroughly** to ensure good UX for legitimate users
6. ✅ **Educate users** about security policies
7. ✅ Consider **session timeout** for inactive users
8. ✅ Implement **IP whitelisting** for extra security

## 🔄 Updates and Maintenance

- **Keep protections updated** as browsers evolve
- **Monitor false positives** - don't annoy legitimate users
- **Review security logs** regularly
- **Update bypass techniques** as new methods are discovered

## 📞 Support

For issues or questions:
1. Check console for error messages
2. Verify configuration in `securityConfig.js`
3. Test in different browsers
4. Review security event logs

## 🔗 Additional Resources

- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Content Security Policy (CSP)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

**Remember**: Client-side security is about creating **friction** and **deterrence**, not absolute prevention. Always prioritize server-side security measures for protecting sensitive data.


