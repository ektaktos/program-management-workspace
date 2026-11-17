// Content for the first-run tour and the "How to use" help panel. Pure data.

export interface TourStep {
  target: string;      // matches a data-tour attribute in the app
  section: string;
  title: string;
  body: string;
  tip: string;
  // Phones (under 768px): a smaller target when the usual one is taller than the screen,
  // and a tip without keyboard shortcuts
  mobileTarget?: string;
  mobileTip?: string;
}

// The tour runs on the Dashboard, where every target is on screen
export const TOUR_STEPS: TourStep[] = [
  { target: 'stats', section: 'Dashboard', title: 'Your day at a glance',
    body: 'Completion, tasks, projects and anything overdue, updated as you work.',
    tip: 'Click the Tasks, Projects or Overdue card to jump straight to that list.' },
  { target: 'nav-today', section: 'Today', title: 'Everything for today',
    body: 'Tasks due today, planner items and calendar meetings, in one list.',
    tip: 'Click an item’s number to set its order, or use Move to send it to another day.' },
  { target: 'nav-projects', section: 'Projects', title: 'Where your work lives',
    body: 'Each project holds sections and tasks. Open a section card to see and edit its tasks.',
    tip: 'All Tasks lists every task in one ledger, where you can edit details inline.' },
  { target: 'nav-planner', section: 'Weekly Planner', title: 'Plan the week',
    body: 'Lay out each day with tasks and meetings, and close the week with a review.',
    tip: 'Connect your Outlook or Google calendar here with the Calendars button.' },
  { target: 'notes', section: 'Notes', title: 'Capture anything',
    body: 'Write notes on their own or for a project. They all live on the Notes page too.',
    tip: 'Pin a note and it stays at the top of Recent notes.', mobileTarget: 'notes-head' },
  { target: 'quickadd', section: 'Quick add', title: 'Add from anywhere',
    body: 'Capture a to-do, a planner task or a project task without leaving the page you’re on.',
    tip: 'Shortcut: ⌘K on a Mac, Ctrl+K on Windows.',
    mobileTip: 'Tap + on any page; it’s always in the top bar.' },
  { target: 'bell', section: 'Notifications', title: 'Never miss a thing',
    body: 'Task alerts, meeting reminders, your morning summary and the weekly report, with sound.',
    tip: 'Open Settings in the bell to choose reminders, sounds and quiet hours. What’s new is in there too.' },
  { target: 'help', section: 'Help', title: 'Help whenever you need it',
    body: 'Press ? for tips on whichever page you’re on, or to take this tour again.',
    tip: 'That’s the tour. You’re all set.' },
];

export interface HelpTopic {
  id: string;
  label: string;
  views: string[];               // pages that open the panel on this topic
  tips: { title: string; text: string }[];
}

export const HELP_TOPICS: HelpTopic[] = [
  { id: 'dashboard', label: 'Dashboard', views: ['dashboard'], tips: [
    { title: 'Read your stats', text: 'Completion, tasks (with today’s meetings), projects and overdue. Click a card to open that list.' },
    { title: 'Keep an eye on projects', text: 'Active projects show their progress; click one to open it.' },
    { title: 'Jot and pin notes', text: 'Use + New note in Recent notes. Pinned notes stay at the top.' },
  ] },
  { id: 'today', label: 'Today', views: ['today'], tips: [
    { title: 'One list for the day', text: 'Tasks due today, planner items and calendar meetings appear together.' },
    { title: 'Set the order', text: 'Click an item’s number to move it to any position, or to the top or bottom.' },
    { title: 'Move to another day', text: 'Use Move on an item to send it to tomorrow or any date.' },
    { title: 'Tick meetings off early', text: 'Check a calendar meeting once it’s done, even before it ends.' },
  ] },
  { id: 'projects', label: 'Projects', views: ['projects', 'project'], tips: [
    { title: 'Create a project', text: 'Use the + next to Projects in the sidebar.' },
    { title: 'Work in sections', text: 'Inside a project, tasks are grouped into sections. Open a section card to see its tasks.' },
    { title: 'Edit or delete', text: 'Use Edit and Delete in the top bar while a project is open. Finished work can go to the Archive.' },
  ] },
  { id: 'tasks', label: 'All Tasks', views: ['tasks'], tips: [
    { title: 'Every task, one ledger', text: 'Tasks from every project, with columns for the details you’ve set.' },
    { title: 'Edit inline', text: 'Change details like priority and due date right in the row, without opening the task.' },
    { title: 'Open or delete', text: 'Click a task to open it; delete it from the row or from inside the task.' },
  ] },
  { id: 'upcoming', label: 'Upcoming', views: ['upcoming'], tips: [
    { title: 'What’s coming up', text: 'Deadlines, planner items and meetings ahead, grouped by date.' },
    { title: 'Days or weeks', text: 'Switch between Days and Weeks to look further ahead.' },
  ] },
  { id: 'planner', label: 'Weekly Planner', views: ['planner'], tips: [
    { title: 'Plan each day', text: 'Add with New Task and New Meeting in the top bar, or straight into a day.' },
    { title: 'Order and move', text: 'Click a number to set an item’s position; Move sends it to another day.' },
    { title: 'Connect calendars', text: 'Calendars adds your Outlook or Google calendar (read-only) to Today and the planner.' },
    { title: 'Close the week', text: 'Weekly review shows what got done and carries the rest forward. Your weekly PDF report arrives in the bell.' },
  ] },
  { id: 'notes', label: 'Notes', views: ['notes'], tips: [
    { title: 'Write anything', text: 'Notes can stand alone or belong to a project.' },
    { title: 'Find them fast', text: 'Browse the card catalog, a drawer per project, or search all notes.' },
    { title: 'Pin what matters', text: 'Pinned notes stay at the top of Recent notes on the Dashboard.' },
  ] },
  { id: 'archive', label: 'Archive', views: ['archive'], tips: [
    { title: 'Set things aside', text: 'Archived projects and tasks leave your lists but aren’t deleted.' },
    { title: 'Bring them back', text: 'Use Restore to return anything to where it was.' },
  ] },
  { id: 'settings', label: 'Make it yours', views: [], tips: [
    { title: 'Themes', text: 'The palette button changes colours, font, card style and background.' },
    { title: 'Notifications', text: 'The bell’s Settings tab sets reminders, sound, quiet hours and pop-ups.' },
    { title: 'Your menu', text: 'Drag sidebar items to reorder them; click the workspace name to rename it.' },
    { title: 'Quick add', text: 'Press ⌘K (Ctrl+K on Windows) anywhere to capture a to-do or task.' },
  ] },
];

export function helpTopicFor(view: string): string {
  return HELP_TOPICS.find(t => t.views.includes(view))?.id ?? 'dashboard';
}
