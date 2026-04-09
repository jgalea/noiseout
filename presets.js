// presets.js -- Toggle metadata and defaults

// All toggle keys with display names, categories, and page scopes.
// `pages` is an array of URL pathname prefixes where the toggle is relevant.
// ['*'] means it applies globally (used for highlighting, not enforcement).
const TOGGLE_META = {
  feed:               { label: 'Main Feed',            category: 'Feed',         pages: ['/feed'] },
  sponsoredPosts:     { label: 'Sponsored Posts',      category: 'Feed',         pages: ['/feed'] },
  offers:             { label: 'Offers / Promo Cards', category: 'Feed',         pages: ['/feed'] },
  postComposer:       { label: 'Post Composer',        category: 'Feed',         pages: ['/feed'] },
  postMetrics:        { label: 'Post Metrics',         category: 'Feed',         pages: ['/feed'] },
  postComments:       { label: 'Post Comments',        category: 'Feed',         pages: ['/feed'] },
  puzzles:            { label: 'Puzzles / Games',      category: 'Feed Sidebar', pages: ['/feed'] },
  addToFeed:          { label: '"Add to your feed"',   category: 'Feed Sidebar', pages: ['/feed'] },
  linkedinNews:       { label: 'LinkedIn News',        category: 'Feed Sidebar', pages: ['/feed'] },
  sidebarAds:         { label: 'Sidebar Ads',          category: 'Feed Sidebar', pages: ['/feed'] },
  footer:             { label: 'Footer',               category: 'Feed Sidebar', pages: ['*'] },
  notificationBadges: { label: 'Notification Badges',  category: 'Navigation',   pages: ['*'] },
  messagingPopup:     { label: 'Messaging Popup',      category: 'Navigation',   pages: ['*'] },
  premiumUpsell:      { label: 'Premium Upsell',       category: 'Navigation',   pages: ['*'] },
  forBusiness:        { label: '"For Business" Nav',   category: 'Navigation',   pages: ['*'] },
  jobsNav:            { label: 'Jobs Nav Item',        category: 'Navigation',   pages: ['*'] },
  profileCard:        { label: 'Profile Card',         category: 'Left Sidebar', pages: ['/feed'] },
  companyPageLinks:   { label: 'Company Page Links',   category: 'Left Sidebar', pages: ['/feed'] },
  growSuggestions:    { label: '"People You May Know"', category: 'My Network',  pages: ['/mynetwork', '/in/', '/search/'] },
  premiumRequests:    { label: 'Premium Requests',     category: 'Services',     pages: ['/service-marketplace'] },
  blackAndWhite:      { label: 'Black & White',        category: 'Visual',       pages: ['*'] }
};

// Order of categories in the UI (other keys appended at the end).
const CATEGORY_ORDER = [
  'Visual',
  'Feed',
  'Feed Sidebar',
  'Navigation',
  'Left Sidebar',
  'My Network',
  'Services'
];

// Default toggle state -- a sensible "clean reading experience".
const DEFAULT_TOGGLES = {
  feed:               false,
  sponsoredPosts:     true,
  offers:             true,
  postComposer:       false,
  postMetrics:        false,
  postComments:       false,
  puzzles:            true,
  addToFeed:          true,
  linkedinNews:       false,
  sidebarAds:         true,
  footer:             true,
  notificationBadges: false,
  messagingPopup:     false,
  premiumUpsell:      true,
  forBusiness:        false,
  jobsNav:            false,
  profileCard:        false,
  companyPageLinks:   false,
  growSuggestions:    true,
  premiumRequests:    true,
  blackAndWhite:      false
};

const DEFAULT_STATE = {
  masterEnabled: true,
  toggles: Object.assign({}, DEFAULT_TOGGLES)
};
