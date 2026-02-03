import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InfoCircle } from 'iconoir-react';
import './Tooltip.css';

export default function Tooltip({ tooltipKey, children, position = 'top', icon = true }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { t } = useTranslation();

  const tooltipText = t(`tooltips.${tooltipKey}`);

  return (
    <div 
      className="tooltip-wrapper"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {icon && <InfoCircle width={14} height={14} className="tooltip-icon" />}
      {showTooltip && tooltipText && (
        <div className={`tooltip-bubble tooltip-${position}`}>
          {tooltipText}
        </div>
      )}
    </div>
  );
}


