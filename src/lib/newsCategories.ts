/**
 * Shared definition for news story categories — used to give a photo-less
 * story a placeholder that says something (Card's grid tile and NewsReel's
 * masthead slide both need it), and by the content schema so a post can only
 * declare a category this file actually knows how to draw.
 *
 * One accent per category, walked in the dataviz skill's validated adjacent
 * categorical order (blue, orange, aqua, yellow, magenta, green) — checked
 * with the skill's validate_palette.js: CVD separation and the normal-vision
 * floor both pass. Every use pairs the color with an icon and a permanent,
 * always-visible text label — color is never the only signal.
 */

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

// One line-icon per category, in the site's existing stroke style (24x24,
// no fill) — a mic for a talk, a map pin for a visit, a checkmark for a
// milestone, a medal for an award, a person-plus for a new arrival, a
// briefcase for a grant.
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

// A diagonal gradient per category — vivid near-white-lifted stop to a deep,
// ink-mixed stop — for the panel a photo-less story shows instead of a photo.
// White text and icon always sit on top of these, so contrast is guaranteed
// by the dark stop and the chip's own scrim, not recomputed per hue.
export const CATEGORY_STYLE: Record<NewsCategory, { from: string; to: string }> = {
  presentation: { from: '#3b83d9', to: '#1b3f6f' },
  visit: { from: '#ed7444', to: '#713826' },
  milestone: { from: '#2db585', to: '#145845' },
  award: { from: '#eea914', to: '#72520e' },
  'new-member': { from: '#ea86ab', to: '#704158' },
  grant: { from: '#148d14', to: '#08440e' },
};
