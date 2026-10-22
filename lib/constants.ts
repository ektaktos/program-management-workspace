export const STATUS_META = {
  todo:       { label: 'To Do',       badgeClass: 'badge-gray',    dot: '#aca194' },
  inprogress: { label: 'In Progress', badgeClass: 'badge-primary', dot: '#a7b7c1' },
  inreview:   { label: 'In Review',   badgeClass: 'badge-orange',  dot: '#d6bea4' },
  overdue:    { label: 'Overdue',     badgeClass: 'badge-danger',  dot: '#b9786a' },
  done:       { label: 'Done',        badgeClass: 'badge-success', dot: '#a9bca1' },
} as const;

export const STATUS_ORDER = ['todo', 'inprogress', 'inreview', 'overdue', 'done'] as const;

export const PROJECT_STATUS_META: Record<string, { badgeClass: string }> = {
  'Active':    { badgeClass: 'badge-success' },
  'Planning':  { badgeClass: 'badge-primary' },
  'On Hold':   { badgeClass: 'badge-warning' },
  'Completed': { badgeClass: 'badge-gray' },
};

// Project colour presets — muted Japandi earth tones (existing projects keep their colour)
export const COLORS = [
  '#a9b8a1', '#c9a990', '#b9a58b', '#93a3ad', '#cbbb9e',
  '#a59a8e', '#b88b7a', '#9ba78f', '#d3c4ab', '#8c7b6b',
  '#b5a9b7', '#c2ae80', '#9fb3ae', '#c49a8c', '#7f8a78',
]

export const PROJECT_TYPES = [
  'Research / Academic',
  'Business / Consulting',
  'Personal / Side Project',
  'Team / Work',
];

export const PRIORITY_META = {
  high:   { label: 'High',   badgeClass: 'badge-danger',  color: '#b9786a' },
  medium: { label: 'Medium', badgeClass: 'badge-warning', color: '#bf9659' },
  low:    { label: 'Low',    badgeClass: 'badge-success', color: '#7d9677' },
} as const;

// Life areas offered when creating/editing a project (free text is also allowed)
export const DEFAULT_AREAS = ['Work', 'Business', 'Personal', 'Health', 'Family', 'Learning', 'Faith', 'Community'];

// Time-estimate presets, in minutes
export const ESTIMATE_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240];

// Default daily limit; a day with more planned minutes than the limit is flagged as overbooked
export const DAILY_CAPACITY_MIN = 6 * 60;

// Choices for the adjustable daily limit: 1h–12h in 30-minute steps
export const CAPACITY_OPTIONS = Array.from({ length: 23 }, (_, i) => 60 + i * 30);

// Sidebar menu entries, in their default order (the user can drag to reorder; order syncs via settings)
export const NAV_IDS = ['dashboard', 'today', 'projects', 'tasks', 'upcoming', 'planner', 'notes', 'report', 'archive'];
