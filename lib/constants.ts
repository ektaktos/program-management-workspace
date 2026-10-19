export const STATUS_META = {
  todo:       { label: 'To Do',       badgeClass: 'badge-gray',    dot: '#b9aea1' },
  inprogress: { label: 'In Progress', badgeClass: 'badge-primary', dot: '#c2dcef' },
  inreview:   { label: 'In Review',   badgeClass: 'badge-orange',  dot: '#f5cfb3' },
  overdue:    { label: 'Overdue',     badgeClass: 'badge-danger',  dot: '#d68a8a' },
  done:       { label: 'Done',        badgeClass: 'badge-success', dot: '#b9dfc8' },
} as const;

export const STATUS_ORDER = ['todo', 'inprogress', 'inreview', 'overdue', 'done'] as const;

export const PROJECT_STATUS_META: Record<string, { badgeClass: string }> = {
  'Active':    { badgeClass: 'badge-success' },
  'Planning':  { badgeClass: 'badge-primary' },
  'On Hold':   { badgeClass: 'badge-warning' },
  'Completed': { badgeClass: 'badge-gray' },
};

export const COLORS = [
  '#b6a4e8', '#f5c5d3', '#b9dfc8', '#c2dcef', '#f5cfb3',
  '#f3e3a6', '#d68a8a', '#a995d9', '#e0a98a', '#8ac4d9',
  '#c8e6c9', '#ffcc80', '#ef9a9a', '#ce93d8', '#80cbc4',
];

export const PROJECT_TYPES = [
  'Research / Academic',
  'Business / Consulting',
  'Personal / Side Project',
  'Team / Work',
];

export const PRIORITY_META = {
  high:   { label: 'High',   badgeClass: 'badge-danger',  color: '#d68a8a' },
  medium: { label: 'Medium', badgeClass: 'badge-warning', color: '#d49a5d' },
  low:    { label: 'Low',    badgeClass: 'badge-success', color: '#6fa885' },
} as const;

// Life areas offered when creating/editing a project (free text is also allowed)
export const DEFAULT_AREAS = ['Work', 'Business', 'Personal', 'Health', 'Family', 'Learning', 'Faith', 'Community'];

// Time-estimate presets, in minutes
export const ESTIMATE_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 240];

// Default daily limit; a day with more planned minutes than the limit is flagged as overbooked
export const DAILY_CAPACITY_MIN = 6 * 60;

// Choices for the adjustable daily limit: 1h–12h in 30-minute steps
export const CAPACITY_OPTIONS = Array.from({ length: 23 }, (_, i) => 60 + i * 30);
