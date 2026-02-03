import { useEffect } from 'react';
import { initializeSecurityProtections } from '../utils/securityProtection';

/**
 * Custom React Hook for Security Protection
 * 
 * Usage:
 * ```jsx
 * import useSecurityProtection from './hooks/useSecurityProtection';
 * 
 * function App() {
 *   useSecurityProtection({
 *     disableRightClickMenu: true,
 *     disableKeyboardShortcuts: true,
 *     detectDevToolsOpen: true,
 *     showWatermark: false
 *   });
 *   
 *   return <div>Your App</div>;
 * }
 * ```
 */
const useSecurityProtection = (options = {}) => {
  useEffect(() => {
    // Initialize security protections when component mounts
    initializeSecurityProtections(options);
    
    // Cleanup function
    return () => {
      // Remove event listeners if needed
      // Note: Most protections should remain active throughout the app lifecycle
    };
  }, []); // Empty dependency array means this runs once on mount
};

export default useSecurityProtection;


