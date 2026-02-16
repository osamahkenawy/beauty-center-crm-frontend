/**
 * Show a "Contact Support" alert instead of performing a delete action.
 * Used across the entire CRM to prevent accidental data deletion.
 */
export function showContactSupport() {
  alert(
    '🚫 This action is not available.\n\n' +
    'To delete records, please contact Trasealla support:\n\n' +
    '📧 info@trasealla.com'
  );
}

// Alias for backwards compatibility
export const supportAlert = showContactSupport;
