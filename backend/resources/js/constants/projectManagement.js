/**
 * Project management list page: column definitions and badge color mappings.
 * Type colors keyed by project type name (from API); status/priority are fixed enums.
 */

export const PROJECT_LIST_COLUMNS = [
  { header: 'Code', width: '8%' },
  { header: 'Name', width: '18%' },
  { header: 'Client', width: '12%' },
  { header: 'Type', width: '10%' },
  { header: 'Contract Amount', width: '12%' },
  { header: 'Progress', width: '15%' },
  { header: 'Status', width: '8%' },
  { header: 'Priority', width: '8%' },
  { header: 'Action', width: '9%' },
];

export const STATUS_COLORS = {
  active: 'bg-blue-100 text-blue-800 border border-blue-200',
  on_hold: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  completed: 'bg-green-100 text-green-800 border border-green-200',
  cancelled: 'bg-red-100 text-red-800 border border-red-200',
};

export const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800 border border-green-200',
  medium: 'bg-blue-100 text-blue-800 border border-blue-200',
  high: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
};

/** Fallback for project types not in this map; key by type name (lowercase). */
export const TYPE_COLORS = {
  design: 'bg-purple-100 text-purple-800 border border-purple-200',
  construction: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  consultancy: 'bg-blue-100 text-blue-800 border border-blue-200',
  maintenance: 'bg-green-100 text-green-800 border border-green-200',
  structural: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  civil: 'bg-orange-100 text-orange-800 border border-orange-200',
  mechanical: 'bg-pink-100 text-pink-800 border border-pink-200',
  electrical: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
  environmental: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  geotechnical: 'bg-amber-100 text-amber-800 border border-amber-200',
  surveying: 'bg-teal-100 text-teal-800 border border-teal-200',
};

export const DEFAULT_TYPE_CLASS = 'bg-gray-100 text-gray-800 border border-gray-200';
