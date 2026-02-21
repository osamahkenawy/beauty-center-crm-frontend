import {
  Scissors, Tag, Store, Bell, CalendarCheck, Sparkles, Pencil,
  Inbox, AlarmClock, Megaphone, CalendarPlus, Zap, Ban, Smartphone, Save,
  Palette, Droplets, Hand, Eye, Gift, Gem, Flower2, Heart, Flame, Star,
  Crown, Wand2, Brush, CircleDot, Feather, Waves, Sun, Moon, Leaf, ShieldCheck,
  GitBranch, Navigation, MapPinned, Users, Building2, Award, Clock3,
  CreditCard, FileText, Boxes, Settings2, Globe2, BarChart3, UserCog,
  Receipt, Wallet, Link2
} from 'lucide-react';

// ── Currencies ──
export const CURRENCIES = [
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal' },
  { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar' },
  { code: 'OMR', symbol: 'ر.ع', name: 'Omani Rial' },
  { code: 'EGP', symbol: 'ج.م', name: 'Egyptian Pound' },
  { code: 'JOD', symbol: 'د.ا', name: 'Jordanian Dinar' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
];

export const getCurrencySymbol = (code) => {
  const c = CURRENCIES.find(cur => cur.code === code);
  return c ? c.symbol : code;
};

// ── Duration Options ──
export const DURATION_OPTIONS = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 25, label: '25 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1h' },
  { value: 75, label: '1h 15min' },
  { value: 90, label: '1h 30min' },
  { value: 105, label: '1h 45min' },
  { value: 120, label: '2h' },
  { value: 150, label: '2h 30min' },
  { value: 180, label: '3h' },
  { value: 240, label: '4h' },
];

export const formatDuration = (mins) => {
  if (!mins) return '1h';
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
};

// ── Lucide Icon Map (for categories) ──
export const ICON_MAP = {
  scissors: Scissors, palette: Palette, droplets: Droplets, hand: Hand,
  eye: Eye, gift: Gift, gem: Gem, flower: Flower2, heart: Heart,
  flame: Flame, star: Star, crown: Crown, wand: Wand2, brush: Brush,
  sparkles: Sparkles, circle: CircleDot, feather: Feather, waves: Waves,
  sun: Sun, moon: Moon, leaf: Leaf, shield: ShieldCheck, tag: Tag,
};
export const ICON_OPTIONS = Object.keys(ICON_MAP);

export const renderCatIcon = (iconName, size = 20, color) => {
  const IconComp = ICON_MAP[iconName];
  if (IconComp) return <IconComp size={size} color={color} strokeWidth={2} />;
  if (typeof iconName === 'string' && iconName.length <= 4) return <span style={{ fontSize: size }}>{iconName}</span>;
  return <Sparkles size={size} color={color} strokeWidth={2} />;
};

// ── Three-dot menu SVG ──
export const svgDots = (
  <svg width="16px" height="16px" viewBox="0 0 24 24" version="1.1">
    <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
      <rect x="0" y="0" width="24" height="24"></rect>
      <circle fill="currentColor" cx="5" cy="12" r="2.5"></circle>
      <circle fill="currentColor" cx="12" cy="12" r="2.5"></circle>
      <circle fill="currentColor" cx="19" cy="12" r="2"></circle>
    </g>
  </svg>
);

// ── Settings Hub Card Definitions ──
export const SETTINGS_CARDS = {
  settings: [
    {
      id: 'business',
      icon: Store,
      title: 'Business setup',
      desc: 'Customise business details, manage locations, and external links.',
      tab: 'business',
    },
    {
      id: 'scheduling',
      icon: CalendarCheck,
      title: 'Scheduling',
      desc: 'Set your availability, working hours and booking preferences.',
      tab: 'hours',
    },
    {
      id: 'catalog',
      icon: Scissors,
      title: 'Service menu',
      desc: 'Manage your services, categories, pricing and team assignments.',
      tab: 'services',
    },
    {
      id: 'team',
      icon: Users,
      title: 'Team',
      desc: 'Manage permissions, staff roles and time-off.',
      tab: 'team',
    },
    {
      id: 'sales',
      icon: Receipt,
      title: 'Sales',
      desc: 'Configure payment methods, taxes, receipts and gift cards.',
      tab: 'sales',
    },
    {
      id: 'notifications',
      icon: Bell,
      title: 'Notifications',
      desc: 'Control booking confirmations, reminders and marketing messages.',
      tab: 'notifications',
    },
  ],
  online: [
    {
      id: 'booking-rules',
      icon: Globe2,
      title: 'Online booking',
      desc: 'Configure online booking rules, cancellation policies and limits.',
      tab: 'booking',
    },
  ],
};

// ── Default Working Hours ──
export const DEFAULT_WORKING_HOURS = {
  saturday: { open: '09:00', close: '22:00', isOpen: true },
  sunday: { open: '09:00', close: '22:00', isOpen: true },
  monday: { open: '09:00', close: '22:00', isOpen: true },
  tuesday: { open: '09:00', close: '22:00', isOpen: true },
  wednesday: { open: '09:00', close: '22:00', isOpen: true },
  thursday: { open: '09:00', close: '22:00', isOpen: true },
  friday: { open: '14:00', close: '22:00', isOpen: true },
};

// ── Empty Forms ──
export const EMPTY_BRANCH_FORM = {
  name: '', name_ar: '', code: '', address: '', city: '', state_province: '', country: 'UAE',
  postal_code: '', latitude: '', longitude: '', phone: '', email: '', description: '',
  is_headquarters: false, is_active: true, timezone: 'Asia/Dubai', currency: 'AED',
  working_hours: { ...DEFAULT_WORKING_HOURS },
};

export const EMPTY_SERVICE_FORM = {
  name: '', description: '', sku: '', unit_price: '', currency: 'AED', price_type: 'fixed',
  category_id: '', branch_id: '', duration: '60', processing_time: '0', finishing_time: '0',
  stock_quantity: 0, is_active: true, online_booking: true, requires_resources: false,
};

export const EMPTY_CATEGORY_FORM = {
  name: '', name_ar: '', icon: 'sparkles', color: '#E91E63', sort_order: 1, is_active: 1,
};

export const EMPTY_RESOURCE_FORM = {
  name: '', type: 'room', branch_id: '', description: '', capacity: 1, is_active: true,
};
