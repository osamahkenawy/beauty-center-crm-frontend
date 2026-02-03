/**
 * Security Protection Configuration
 * 
 * Customize these settings based on your security requirements.
 * 
 * IMPORTANT: These protections are CLIENT-SIDE deterrents only.
 * They can be bypassed by determined users.
 * Always implement proper SERVER-SIDE security measures.
 */

export const securityConfig = {
  // Enable/disable security features
  enabled: true,
  
  // Disable right-click context menu
  disableRightClick: true,
  
  // Disable keyboard shortcuts for DevTools
  disableDevToolsShortcuts: true,
  
  // Detect when DevTools is opened
  detectDevTools: true,
  
  // Disable text selection (can hurt UX)
  disableTextSelection: false,
  
  // Disable copy/paste operations (can hurt UX)
  disableCopyPaste: false,
  
  // Show watermark on sensitive pages
  showWatermark: false,
  watermarkText: 'CONFIDENTIAL - TRASEALLA CRM',
  
  // Pages where security should be strictest
  strictSecurityPages: [
    '/dashboard',
    '/reports',
    '/audit-logs',
    '/contacts',
    '/leads',
    '/deals',
    '/accounts'
  ],
  
  // Console warning message
  consoleWarning: {
    enabled: true,
    title: '⚠️ SECURITY WARNING',
    messages: [
      'Unauthorized access to this application is prohibited.',
      'All activities are monitored and logged.',
      'If you are a developer, please contact your administrator.'
    ]
  },
  
  // Callback for when DevTools is detected
  onDevToolsDetected: (isOpen) => {
    if (isOpen) {
      // You can log this event to your backend
      // logSecurityEvent('devtools_opened', { timestamp: Date.now() });
      console.warn('🔒 Security Alert: Developer tools detected');
    }
  },
  
  // Callback for when protected actions are attempted
  onProtectedAction: (action) => {
    // You can log these events to your backend
    // logSecurityEvent('protected_action_attempted', { action, timestamp: Date.now() });
    console.warn(`🔒 Protected action attempted: ${action}`);
  }
};

/**
 * Get security settings for a specific page
 */
export const getSecuritySettingsForPage = (pathname) => {
  const isStrictPage = securityConfig.strictSecurityPages.includes(pathname);
  
  return {
    ...securityConfig,
    // Enable stricter settings on sensitive pages
    disableTextSelection: isStrictPage ? true : securityConfig.disableTextSelection,
    showWatermark: isStrictPage ? true : securityConfig.showWatermark,
  };
};

export default securityConfig;


