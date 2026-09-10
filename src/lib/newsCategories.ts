export const NEWS_CATEGORIES = [
  'presentation',
  'visit',
  'milestone',
  'award',
  'new-member',
  'grant',
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<NewsCategory, string> = {
  presentation: 'Presentation',
  visit: 'Visit',
  milestone: 'Milestone',
  award: 'Award',
  'new-member': 'New member',
  grant: 'Grant',
};

// SVG paths use a 24x24 viewBox, a stroke, and no fill.
export const CATEGORY_ICON: Record<NewsCategory, string> = {
  presentation:
    '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
  visit:
    '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  milestone: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  award:
    '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
  'new-member':
    '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
  grant:
    '<rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
};

// Gradients for category panels; labels sit on a dark overlay.
export const CATEGORY_STYLE: Record<NewsCategory, { from: string; to: string }> = {
  presentation: { from: '#3b83d9', to: '#1b3f6f' },
  visit: { from: '#ed7444', to: '#713826' },
  milestone: { from: '#2db585', to: '#145845' },
  award: { from: '#eea914', to: '#72520e' },
  'new-member': { from: '#ea86ab', to: '#704158' },
  grant: { from: '#148d14', to: '#08440e' },
};
