// ── Your original brand colours (unchanged) ────────────────────────────────────
const Brand = {
  blue400:   '#60A5FA',
  blue500:   '#3B82F6',
  blue600:   '#2563EB',
  purple500: '#8B5CF6',
  green500:  '#10B981',
  amber500:  '#F59E0B',
  red500:    '#EF4444',
  red600:    '#DC2626',
  gray500:   '#6B7280',
  gray600:   '#4B5563',
  gray900:   '#111827',
  gray200:   '#E5E7EB',
  gray100:   '#F3F4F6',
} as const;

// ── Client-app warm design tokens (surfaces & ink) ─────────────────────────────
export const D = {
  ink:        '#0F0F0E',
  inkMid:     '#4A4845',
  inkLight:   '#9A9691',
  chalk:      '#FAFAF8',
  surface:    '#FFFFFF',
  hairline:   '#E8E5DF',
  hairlineMd: '#D4D0C8',

  // Accent colours — YOUR original values
  blue:    Brand.blue500,
  blueBg:  '#EFF6FF',
  green:   Brand.green500,
  greenBg: '#ECFDF5',
  red:     Brand.red500,
  redBg:   '#FEF2F2',
  amber:   Brand.amber500,
  amberBg: '#FFFBEB',
  gray:    Brand.gray500,
  grayBg:  Brand.gray100,
  purple:  Brand.purple500,
  purpleBg:'#F5F3FF',
} as const;

// ── AppColors — backward-compatible alias layer ────────────────────────────────
export const AppColors = {
  primary:      Brand.blue500,
  primaryDark:  Brand.blue600,
  primaryLight: Brand.blue400,
  secondary:    Brand.purple500,
  success:      Brand.green500,
  warning:      Brand.amber500,
  error:        Brand.red500,
  info:         Brand.blue500,
  pending:      Brand.gray500,
  inProgress:   Brand.blue500,
  completed:    Brand.green500,
  low:          Brand.gray500,
  medium:       Brand.amber500,
  high:         Brand.red500,
  critical:     Brand.red600,
  open:         Brand.red500,
  resolved:     Brand.green500,
  closed:       Brand.gray500,
  background:   D.chalk,
  card:         D.surface,
  border:       D.hairline,
  shadow:       'transparent',
  text:         D.ink,
  textSecondary: D.inkMid,
  textTertiary:  D.inkLight,
  backgroundDark:    '#0f172a',
  cardDark:          '#1e293b',
  textDark:          '#f1f5f9',
  textSecondaryDark: '#94a3b8',
  borderDark:        '#334155',
  shadowDark:        'rgba(0,0,0,0.3)',
} as const;

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':                return Brand.gray500;
    case 'in_progress':
    case 'in-progress':            return Brand.blue500;
    case 'completed':
    case 'active':                 return Brand.green500;
    case 'on-hold':                return Brand.amber500;
    default:                       return D.inkLight;
  }
}

export function getStatusBg(status: string): string {
  switch (status) {
    case 'pending':                return D.grayBg;
    case 'in_progress':
    case 'in-progress':            return D.blueBg;
    case 'completed':
    case 'active':                 return D.greenBg;
    case 'on-hold':                return D.amberBg;
    default:                       return '#F0EFED';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'low':      return Brand.gray500;
    case 'medium':   return Brand.amber500;
    case 'high':     return Brand.red500;
    case 'critical': return Brand.red600;
    default:         return D.inkLight;
  }
}

export function getPriorityBg(priority: string): string {
  switch (priority) {
    case 'low':      return D.grayBg;
    case 'medium':   return D.amberBg;
    case 'high':
    case 'critical': return D.redBg;
    default:         return '#F0EFED';
  }
}

export function getIssueStatusColor(status: string): string {
  switch (status) {
    case 'open':        return Brand.red500;
    case 'in_progress': return Brand.blue500;
    case 'resolved':    return Brand.green500;
    case 'closed':      return Brand.gray500;
    default:            return D.inkLight;
  }
}

export function getIssueStatusBg(status: string): string {
  switch (status) {
    case 'open':        return D.redBg;
    case 'in_progress': return D.blueBg;
    case 'resolved':    return D.greenBg;
    case 'closed':      return D.grayBg;
    default:            return '#F0EFED';
  }
}