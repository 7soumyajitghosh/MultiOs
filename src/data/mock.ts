import {
  Archive,
  CalendarDays,
  Files,
  Home,
  KanbanSquare,
  Settings,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Favorites',
    items: [
      { id: 'overview', label: 'Overview', icon: Home },
      { id: 'projects', label: 'Projects', icon: KanbanSquare, badge: 8 },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays },
      { id: 'documents', label: 'Documents', icon: Files, badge: 24 },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { id: 'starred', label: 'Starred', icon: Star },
      { id: 'team', label: 'Team', icon: Users, badge: 5 },
      { id: 'archive', label: 'Archive', icon: Archive },
    ],
  },
  {
    title: 'System',
    items: [{ id: 'settings', label: 'Settings', icon: Settings }],
  },
];

export interface Project {
  id: string;
  name: string;
  owner: string;
  initials: string;
  status: 'Active' | 'Review' | 'Paused' | 'Shipped';
  progress: number;
  updated: string;
}

export const PROJECTS: Project[] = [
  { id: 'p1', name: 'Aurora design system', owner: 'Maya Chen', initials: 'MC', status: 'Active', progress: 72, updated: '2m ago' },
  { id: 'p2', name: 'Desktop shell refresh', owner: 'Jonas Park', initials: 'JP', status: 'Review', progress: 91, updated: '18m ago' },
  { id: 'p3', name: 'Command palette v2', owner: 'Priya Nair', initials: 'PN', status: 'Active', progress: 48, updated: '1h ago' },
  { id: 'p4', name: 'Accessibility audit', owner: 'Sam Ortiz', initials: 'SO', status: 'Paused', progress: 23, updated: '3h ago' },
  { id: 'p5', name: 'Onboarding flow', owner: 'Lena Wu', initials: 'LW', status: 'Shipped', progress: 100, updated: 'Yesterday' },
];

export interface ActivityItem {
  id: string;
  actor: string;
  action: string;
  time: string;
}

export const ACTIVITY: ActivityItem[] = [
  { id: 'a1', actor: 'Maya Chen', action: 'moved 3 cards to Review', time: '9:42 AM' },
  { id: 'a2', actor: 'Jonas Park', action: 'commented on Desktop shell refresh', time: '9:15 AM' },
  { id: 'a3', actor: 'Priya Nair', action: 'published palette shortcuts', time: '8:58 AM' },
  { id: 'a4', actor: 'Sam Ortiz', action: 'flagged 2 contrast issues', time: 'Yesterday' },
];
