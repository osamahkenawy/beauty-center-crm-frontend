import Swal from 'sweetalert2';

/**
 * Show a "Contact Support" alert instead of performing a delete action.
 * Used across the entire CRM to prevent accidental data deletion.
 */
export function showContactSupport() {
  Swal.fire({
    title: 'Cannot Delete',
    html: `
      <div style="text-align:center;">
        <p style="margin:0 0 12px;color:#666;font-size:14px;">For complete removal, please contact Trasealla support:</p>
        <div style="background:#f9f9fb;border-radius:10px;padding:14px;display:inline-block;">
          <p style="margin:0;font-size:15px;"><strong>📧 info@trasealla.com</strong></p>
        </div>
      </div>
    `,
    icon: 'info',
    confirmButtonColor: '#f2421b',
    confirmButtonText: 'Got it'
  });
}

// Alias for backwards compatibility
export const supportAlert = showContactSupport;
