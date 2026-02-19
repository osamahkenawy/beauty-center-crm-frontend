import { DirhamSymbol } from 'dirham-symbol';
import 'dirham-symbol/dist/index.css';

/**
 * CurrencySymbol Component
 * Displays the appropriate currency symbol
 * Uses DirhamSymbol component for AED, otherwise displays the symbol as text
 */
export default function CurrencySymbol({ currency, symbol, className = '', style = {} }) {
  if (currency === 'AED') {
    return <DirhamSymbol className={className} style={style} />;
  }
  return <span className={className} style={style}>{symbol}</span>;
}
