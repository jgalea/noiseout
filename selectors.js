// selectors.js -- Toggle-to-selector mappings
//
// LinkedIn uses hashed CSS classes that change every build, so we rely on
// stable hooks: data-testid, aria-label, role, href patterns. Where attribute
// selectors are not enough, a `find` function returns the elements to hide.
//
// Each toggle has any combination of:
//   css:  array of CSS selectors injected into <style>
//   find: function() => Element[] (run on each DOM update)

const SELECTORS = {
  // ============ Visual ============
  blackAndWhite: {
    cssRules: ['html { filter: grayscale(100%) !important; }']
  },

  // ============ Feed Area ============
  feed: {
    css: ['[data-testid="mainFeed"]']
  },

  sponsoredPosts: {
    find: function () {
      var hits = [];
      var feed = document.querySelector('[data-testid="mainFeed"]');
      if (!feed) return hits;
      var items = feed.querySelectorAll('[role="listitem"]');
      for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var spans = item.querySelectorAll('span');
        for (var j = 0; j < spans.length; j++) {
          if (spans[j].textContent.trim() === 'Promoted') {
            hits.push(item);
            break;
          }
        }
      }
      return hits;
    }
  },

  offers: {
    find: function () {
      // LinkedIn first-party promo cards: "Grow your business on LinkedIn",
      // "Scale your Page posts", "Claim offer" / "Learn more" buttons linking
      // to business.linkedin.com/* (marketing-solutions, advertise, etc.) or
      // linkedin.com/premium/products. Also catches anchors inside the feed
      // pointing to business.linkedin.com.
      var hits = [];
      var anchors = document.querySelectorAll('a[href*="//business.linkedin.com/"], a[href*="linkedin.com/marketing-solutions"], a[href*="linkedin.com/premium/products"]');
      for (var i = 0; i < anchors.length; i++) {
        var card = walkUpToCard(anchors[i], 800, 600);
        if (card && hits.indexOf(card) === -1) hits.push(card);
      }
      // Also catch by visible heading text
      var headings = document.querySelectorAll('p, h2, h3, span');
      var needles = [
        'Grow your business on LinkedIn',
        'Scale your Page posts',
        'Spend \u20ac', 'Spend $', 'Spend \u00a3'
      ];
      for (var k = 0; k < headings.length; k++) {
        var t = (headings[k].textContent || '').trim();
        var match = false;
        for (var n = 0; n < needles.length; n++) {
          if (t.indexOf(needles[n]) > -1) { match = true; break; }
        }
        if (!match) continue;
        var card2 = walkUpToCard(headings[k], 800, 600);
        if (card2 && hits.indexOf(card2) === -1) hits.push(card2);
      }
      // Drop hits that are descendants of other hits.
      return hits.filter(function (h) {
        return !hits.some(function (other) { return other !== h && other.contains(h); });
      });
    }
  },

  postComposer: {
    find: function () {
      var btn = document.querySelector('[aria-label="Start a post"]');
      if (!btn) return [];
      // Walk up until we hit a feed list item or grow wider than ~700px.
      var cur = btn;
      for (var i = 0; i < 10; i++) {
        if (!cur.parentElement) break;
        cur = cur.parentElement;
        if (cur.getAttribute && cur.getAttribute('role') === 'listitem') return [cur];
        var rect = cur.getBoundingClientRect();
        if (rect.width > 500) return [cur];
      }
      return [cur];
    }
  },

  postMetrics: {
    find: function () {
      // The "X reactions • Y comments" row inside each post.
      var hits = [];
      var feed = document.querySelector('[data-testid="mainFeed"]');
      if (!feed) return hits;
      var btns = feed.querySelectorAll('button[aria-label$=" reactions"], button[aria-label*=" reactions and "]');
      for (var i = 0; i < btns.length; i++) {
        // Walk up at most 2 levels to the immediate row container.
        var row = btns[i];
        for (var j = 0; j < 2; j++) {
          if (row.parentElement) row = row.parentElement;
        }
        if (hits.indexOf(row) === -1) hits.push(row);
      }
      return hits;
    }
  },

  postComments: {
    find: function () {
      // Comments section: find "Load more comments" buttons or comment text boxes
      // and hide the surrounding container, scoped to the current post.
      var hits = [];
      var feed = document.querySelector('[data-testid="mainFeed"]');
      if (!feed) return hits;
      var anchors = feed.querySelectorAll('button[aria-label*="Load more comments"], button[aria-label="Load previous comments"], [data-testid*="comments-list"]');
      for (var i = 0; i < anchors.length; i++) {
        var section = anchors[i];
        // Walk up until we find the comments wrapper inside the post.
        for (var j = 0; j < 6; j++) {
          if (!section.parentElement) break;
          section = section.parentElement;
          if (section.getAttribute && section.getAttribute('role') === 'listitem') {
            // Too far -- back off one level.
            break;
          }
        }
        if (hits.indexOf(section) === -1) hits.push(section);
      }
      return hits;
    }
  },

  // ============ Right Sidebar ============
  puzzles: {
    find: function () {
      return findSidebarCardsByText([
        "Today's puzzles", "Today\u2019s puzzles", 'Play Patches', 'Play Zip',
        'Play MiniSudoku', 'Play Tango', 'Mini Sudoku', 'Patches #', 'Tango #', 'Zip #'
      ]);
    }
  },

  addToFeed: {
    find: function () {
      return findSidebarCardsByText(['Add to your feed']);
    }
  },

  linkedinNews: {
    find: function () {
      return findSidebarCardsByText([
        'LinkedIn News', 'Top stories', "Today\u2019s top stories", "Today's top stories"
      ]);
    }
  },

  sidebarAds: {
    find: function () {
      return findSidebarCardsByText([
        'Ad Options', 'Why am I seeing this ad', 'Manage your ad preferences', 'advertisement', 'Advertisement'
      ]);
    }
  },

  footer: {
    css: ['footer'],
    find: function () {
      // Right-sidebar footer card on the feed page (no <footer> tag).
      return findSidebarCardsByText([
        'Accessibility', 'Help Center', 'Privacy & Terms', 'LinkedIn Corporation \u00A9'
      ]);
    }
  },

  // ============ Navigation / Chrome ============
  notificationBadges: {
    css: [
      '[data-testid="primary-nav"] [class*="notification-badge"]',
      'header [class*="notification-badge"]',
      'header sup'
    ],
    find: function () {
      // Strip the " X new notifications" suffix from nav-item aria-labels visually
      // by hiding any small badge dot/pill inside primary-nav links.
      var hits = [];
      var nav = document.querySelector('[data-testid="primary-nav"]') || document.querySelector('header nav');
      if (!nav) return hits;
      var items = nav.querySelectorAll('a[aria-label*=" new notification"], a[aria-label*=" new notifications"]');
      for (var i = 0; i < items.length; i++) {
        // Find descendant element whose visible text is purely a number.
        var all = items[i].querySelectorAll('span, div');
        for (var j = 0; j < all.length; j++) {
          var txt = all[j].textContent.trim();
          if (/^\d+\+?$/.test(txt) && all[j].children.length === 0) {
            if (hits.indexOf(all[j]) === -1) hits.push(all[j]);
          }
        }
      }
      return hits;
    }
  },

  messagingPopup: {
    find: function () {
      // The bottom-right messaging overlay drawer (when opened).
      var hits = [];
      var regions = document.querySelectorAll('[role="region"], section, aside');
      for (var i = 0; i < regions.length; i++) {
        var l = (regions[i].getAttribute('aria-label') || '').toLowerCase();
        if (l.indexOf('messag') > -1 && l.indexOf('navigat') === -1) {
          var rect = regions[i].getBoundingClientRect();
          // Bottom-right anchored
          if (rect.bottom > window.innerHeight - 100 && rect.right > window.innerWidth - 200 && rect.width < 600) {
            hits.push(regions[i]);
          }
        }
      }
      return hits;
    }
  },

  premiumUpsell: {
    find: function () {
      // Hide LinkedIn Premium upsell pills and content-area CTAs. Two
      // shapes to catch: (1) the "Try for €0" nav pill in the top-right,
      // (2) in-content "Try Premium for €X" CTAs on /jobs/, profile, etc.
      var hits = [];
      var els = document.querySelectorAll('a, button, span');
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        var t = (el.textContent || '').trim();
        var isNavPill = /^Try for [\u20AC$\u00A3]?0$/.test(t);
        var isContentCta = /^Try Premium\b/.test(t) && t.length < 40;
        var isReactivate = t === 'Reactivate Premium';
        if (!(isNavPill || isContentCta || isReactivate)) continue;
        var rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        // Nav pill: keep tight so we don't grab the whole header row.
        // Content CTA: allow a larger walk-up so we grab the promo card.
        var maxW = isNavPill ? 240 : 500;
        var maxH = isNavPill ? 80 : 260;
        var card = walkUpToCard(el, maxW, maxH);
        if (card && hits.indexOf(card) === -1) hits.push(card);
      }
      return hits;
    }
  },

  forBusiness: {
    css: [
      '[aria-label="For Business"]',
      'button[aria-label^="For Business"]'
    ],
    find: function () {
      // Walk up from the For Business button to its menu container.
      var btn = document.querySelector('[aria-label="For Business"]') || document.querySelector('button[aria-label^="For Business"]');
      if (!btn) return [];
      var cur = btn;
      for (var i = 0; i < 4; i++) {
        if (!cur.parentElement) break;
        cur = cur.parentElement;
      }
      return [cur];
    }
  },

  jobsNav: {
    find: function () {
      // Hide the Jobs item in the primary nav. The link's aria-label is
      // "Jobs, X new notifications" -- find it and walk up to its <li>.
      var hits = [];
      var nav = document.querySelector('[data-testid="primary-nav"]') || document.querySelector('header nav');
      if (!nav) return hits;
      var links = nav.querySelectorAll('a[aria-label^="Jobs"], a[aria-label^="Jobs,"]');
      for (var i = 0; i < links.length; i++) {
        var item = links[i];
        // Walk up to <li> or first multi-child ancestor (the nav item wrapper).
        for (var j = 0; j < 5; j++) {
          if (item.tagName === 'LI') break;
          if (!item.parentElement) break;
          item = item.parentElement;
        }
        if (hits.indexOf(item) === -1) hits.push(item);
      }
      return hits;
    }
  },

  // ============ Left Sidebar ============
  profileCard: {
    find: function () {
      // The left column: find an anchor like "Profile viewers" and walk up.
      var anchor = document.querySelector('[aria-label*="Profile viewers"], [aria-label*="Post impressions"]');
      if (!anchor) return [];
      var cur = anchor;
      while (cur && cur.parentElement) {
        cur = cur.parentElement;
        var r = cur.getBoundingClientRect();
        if (r.width > 200 && r.width < 380 && r.left < 400) return [cur];
      }
      return [];
    }
  },

  companyPageLinks: {
    find: function () {
      var hits = [];
      var spans = document.querySelectorAll('a, span');
      for (var i = 0; i < spans.length; i++) {
        var t = spans[i].textContent.trim();
        if (t === 'Manage your company' || t === 'Manage your page') {
          var card = spans[i];
          for (var j = 0; j < 3; j++) {
            if (!card.parentElement) break;
            card = card.parentElement;
          }
          if (hits.indexOf(card) === -1) hits.push(card);
        }
      }
      return hits;
    }
  },

  // ============ Service Marketplace ============
  premiumRequests: {
    find: function () {
      // Only acts on /service-marketplace/* pages. Hides:
      //   - The "Premium requests" section in the request list
      //   - The right detail panel when it's showing a premium-locked request
      //     ("Unlock this request" marker)
      if (location.pathname.indexOf('/service-marketplace') !== 0) return [];
      var hits = [];

      // 1) Premium requests list section
      var headings = document.querySelectorAll('h1, h2, h3');
      for (var i = 0; i < headings.length; i++) {
        if ((headings[i].textContent || '').trim() !== 'Premium requests') continue;
        var card = headings[i];
        while (card.parentElement) {
          var parentText = card.parentElement.textContent || '';
          if (parentText.indexOf('Direct requests') > -1) break;
          card = card.parentElement;
        }
        if (hits.indexOf(card) === -1) hits.push(card);
      }

      // 2) Right detail panel showing a premium-locked request. Use a text
      // walker so we land on the leaf node (not an ancestor that contains
      // the entire page).
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      var n;
      while ((n = w.nextNode())) {
        var nt = (n.textContent || '').trim();
        if (nt.indexOf('Unlock this request') === -1) continue;
        var section = n.parentElement;
        while (section && section.tagName !== 'SECTION') {
          section = section.parentElement;
        }
        if (section && hits.indexOf(section) === -1) hits.push(section);
        break;
      }

      // Drop hits that are descendants of other hits.
      return hits.filter(function (h) {
        return !hits.some(function (other) { return other !== h && other.contains(h); });
      });
    },
    // Dynamic: the right detail panel is reused for each clicked request.
    // When the user clicks a Direct request the "Unlock this request" text
    // disappears, so the panel should stop being hidden. Stay hidden only
    // while we can still confirm premium content in the element's subtree.
    stillValid: function (el) {
      if (!el || !el.isConnected) return false;
      var text = el.textContent || '';
      // Still the Premium requests list section
      if (text.indexOf('Premium requests') > -1) return true;
      // Still the right panel showing a premium-locked request
      if (text.indexOf('Unlock this request') > -1) return true;
      return false;
    }
  },

  // ============ My Network / People Suggestions ============
  growSuggestions: {
    find: function () {
      // Hides "People you may know" style suggestion sections and the
      // service-request carousel that appears on /mynetwork/grow, plus the
      // same PYMK widgets that show up in /in/* profile sidebars, search
      // results, and elsewhere. Pending invitations stay visible.
      var hits = [];

      // Carousel containers (request cards, "People you may know" carousels).
      document.querySelectorAll('[data-testid="carousel-container"]').forEach(function (c) {
        var card = c;
        while (card.parentElement && card.parentElement.children.length === 1) {
          card = card.parentElement;
        }
        if (hits.indexOf(card) === -1) hits.push(card);
      });

      // Sections with grow-page suggestion / promo text. Walk up from the
      // matching element to the nearest SECTION ancestor, skipping any section
      // that contains the pending-invitations text.
      var headings = document.querySelectorAll('h1, h2, h3, h4, p');
      var needles = [
        'People you may know',
        'connections you may know',
        'Connections you may know',
        'People to follow',
        'Based on your recent activity',
        'based on your activity',
        'More suggestions for you',
        'Suggested for you',
        'Catch up on',
        'People interested in services',
        'Need a 30 second break',
        'Zip is LinkedIn',
        'Patches is LinkedIn',
        'Tango is LinkedIn',
        'Sudoku is LinkedIn',
        'You may be interested'
      ];
      for (var i = 0; i < headings.length; i++) {
        var t = (headings[i].textContent || '').trim();
        var matched = false;
        for (var n = 0; n < needles.length; n++) {
          if (t.indexOf(needles[n]) > -1) { matched = true; break; }
        }
        if (!matched) continue;

        // Walk up to the FIRST SECTION ancestor that doesn't contain pending
        // invitations text. Stop at the smallest such section so each card
        // remains a separate hit.
        var card2 = null;
        var cur = headings[i].parentElement;
        while (cur && cur !== document.body) {
          if (cur.tagName === 'SECTION') {
            var fullText = cur.textContent || '';
            if (fullText.indexOf('pending invitation') === -1) {
              card2 = cur;
            }
            break;
          }
          cur = cur.parentElement;
        }

        // Fallback: closest non-pending-invitations DIV ancestor.
        if (!card2) {
          card2 = headings[i].parentElement;
          while (card2 && card2.parentElement) {
            var pt = card2.parentElement.textContent || '';
            if (pt.indexOf('pending invitation') > -1) break;
            card2 = card2.parentElement;
          }
        }

        if (card2 && hits.indexOf(card2) === -1) hits.push(card2);
      }

      // Drop hits that are descendants of other hits.
      return hits.filter(function (h) {
        return !hits.some(function (other) { return other !== h && other.contains(h); });
      });
    }
  }
};

// Walk up from `el`, returning the highest ancestor whose bounding box stays
// within (maxWidth, maxHeight). Stop as soon as growing further would exceed
// either bound. Returns null if even `el` itself is bigger than the limits or
// if `el` is not currently rendered (zero-sized box).
function walkUpToCard(el, maxWidth, maxHeight) {
  if (!el) return null;
  var rect = el.getBoundingClientRect();
  // Skip elements that aren't visually rendered. A zero-sized box means we
  // can't reliably size-check ancestors via display:contents wrappers.
  if (rect.width === 0 || rect.height === 0) return null;
  if (rect.width > maxWidth || rect.height > maxHeight) return null;
  var best = el;
  var cur = el.parentElement;
  while (cur) {
    var r = cur.getBoundingClientRect();
    if (r.width > maxWidth || r.height > maxHeight) break;
    if (r.width === 0 || r.height === 0) break;
    best = cur;
    cur = cur.parentElement;
  }
  return best;
}

// Walk up to the right-sidebar card. Sidebar cards are 250-380 wide.
function findSidebarCard(el) {
  return walkUpToCard(el, 380, 800);
}

// Find the right-column container (the wrapper around all sidebar cards).
// Uses the [data-testid="mainFeed"] anchor and walks to its grandparent
// siblings — the third sibling is the right column on standard layout.
function findRightColumn() {
  var feed = document.querySelector('[data-testid="mainFeed"]');
  if (!feed || !feed.parentElement || !feed.parentElement.parentElement) return null;
  var sibs = feed.parentElement.parentElement.children;
  for (var i = 0; i < sibs.length; i++) {
    var s = sibs[i];
    if (s.contains(feed)) continue;
    var r = s.getBoundingClientRect();
    if (r.width >= 250 && r.width <= 400) return s;
  }
  return null;
}

// Search inside the right column for cards whose textContent contains any
// of the given needles. LinkedIn wraps each card in `display:contents` divs
// (zero bounding-box), so we cannot use dimensions. Instead we find the
// deepest element whose textContent contains the needle, then walk up only
// while the parent has just one child (i.e., still inside the same card).
// Stop at the right column.
function findSidebarCardsByText(needles) {
  var col = findRightColumn();
  if (!col) return [];
  var hits = [];
  var all = col.querySelectorAll('div, section, article');
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    var text = el.textContent || '';
    var matched = false;
    for (var n = 0; n < needles.length; n++) {
      if (text.indexOf(needles[n]) > -1) { matched = true; break; }
    }
    if (!matched) continue;
    // Reject elements that contain *other* card needles too -- those are
    // ancestors of multiple cards.
    if (containsOtherCardNeedles(el, needles)) continue;
    // Walk up while parent is still inside the column and parent has only
    // this one child (so we stay within the card boundary).
    var card = el;
    while (card.parentElement && card.parentElement !== col && card.parentElement.children.length === 1) {
      card = card.parentElement;
    }
    if (hits.indexOf(card) === -1) hits.push(card);
  }
  // Drop hits that are descendants of other hits.
  return hits.filter(function (h) {
    return !hits.some(function (other) { return other !== h && other.contains(h); });
  });
}

// Returns true if the element's textContent contains any "other card" needle
// from a known list of distinct sidebar card markers. Used to detect
// ancestors that span multiple cards.
function containsOtherCardNeedles(el, ownNeedles) {
  var allCardMarkers = [
    "Today's puzzles", "Today\u2019s puzzles",
    'Add to your feed',
    'LinkedIn News', 'Top stories', "Today\u2019s top stories",
    'Ad Options', 'Why am I seeing this ad', 'Manage your ad preferences',
    'Accessibility', 'Help Center', 'Privacy & Terms'
  ];
  var text = el.textContent || '';
  var otherHit = false;
  for (var i = 0; i < allCardMarkers.length; i++) {
    var marker = allCardMarkers[i];
    if (text.indexOf(marker) === -1) continue;
    var isOwn = false;
    for (var j = 0; j < ownNeedles.length; j++) {
      if (ownNeedles[j].indexOf(marker) > -1 || marker.indexOf(ownNeedles[j]) > -1) {
        isOwn = true; break;
      }
    }
    if (!isOwn) { otherHit = true; break; }
  }
  return otherHit;
}
