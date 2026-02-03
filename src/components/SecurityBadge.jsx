import { useState, useEffect } from 'react';
import './SecurityBadge.css';

/**
 * SecurityBadge Component
 * 
 * Displays a visual indicator that security protections are active.
 * Optional component that can be added to the Layout or specific pages.
 * 
 * Usage:
 * ```jsx
 * import SecurityBadge from './components/SecurityBadge';
 * 
 * function Layout() {
 *   return (
 *     <div>
 *       <SecurityBadge position="bottom-right" />
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 */

const SecurityBadge = ({ 
  position = 'bottom-right',
  variant = 'compact',  // 'compact' | 'full' | 'tooltip'
  showStatus = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [protectionCount, setProtectionCount] = useState(0);

  useEffect(() => {
    // Count active protections
    let count = 0;
    if (document.querySelector('#security-watermark')) count++;
    count += 3; // Right-click, shortcuts, detection (from App.jsx)
    setProtectionCount(count);
  }, []);

  const getPositionClass = () => {
    switch (position) {
      case 'top-left': return 'security-badge--top-left';
      case 'top-right': return 'security-badge--top-right';
      case 'bottom-left': return 'security-badge--bottom-left';
      case 'bottom-right': return 'security-badge--bottom-right';
      default: return 'security-badge--bottom-right';
    }
  };

  if (variant === 'compact') {
    return (
      <div 
        className={`security-badge security-badge--compact ${getPositionClass()}`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        title="Security protections active"
      >
        <div className="security-badge__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        {isExpanded && (
          <div className="security-badge__tooltip">
            <div className="security-badge__tooltip-title">🔒 Protected</div>
            <div className="security-badge__tooltip-text">
              {protectionCount} security features active
            </div>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`security-badge security-badge--full ${getPositionClass()}`}>
        <div className="security-badge__icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <div className="security-badge__content">
          <div className="security-badge__title">Secured</div>
          {showStatus && (
            <div className="security-badge__status">
              <span className="security-badge__status-dot"></span>
              Active
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default SecurityBadge;


