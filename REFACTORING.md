# Thesis Interpretation Assistant — Unified Table Engine Refactoring

## 1. Root Cause Analysis of Inconsistent Logic

### Duplication & Divergence
- **Paste parsing**: `paste-table-utils.js` centralizes `parseClipboardToRows`, `mapToProfileRows`, `mapToLikertRows` — but Profile and Likert each have separate paste handlers and apply logic.
- **Copy All**: Profile, Likert, and Summary each implement `copyRichToClipboard` locally. Likert had a placeholder-row index bug causing config/DOM misalignment when syncing.
- **Compute logic**: Profile uses dense ranks by frequency; Likert uses average-of-positions for ties. Both are correct but implemented separately with no shared module.
- **Q.D. mapping**: Likert has `getQualitativeDescription` and scale mapping; Profile does not use Q.D. No shared Q.D. utility.
- **Manual table mode**: Profile calls `showManualTableState()` on init when "Create manual table" is selected; Likert already had init logic to call `renderManualLikertTable()` when select value is "".

### Bugs Identified
1. **Likert Copy All**: When a placeholder row (`.la-output-empty`) existed in tbody, `forEach` used DOM `idx` to index `currentLikertConfig.rows[idx]`, causing wrong fallbacks when placeholder was skipped.
2. **Dashboard Recent Activity**: `renderRecentActivity()` expected `#recent-activity-list` but the element was missing from `index.html`.
3. **Dashboard empty state**: When `items.length === 0`, the code checked `if (emptyEl)` — but `emptyEl` was `getElementById('recent-activity-empty')` which did not exist, so no empty message was ever shown.

---

## 2. Refactoring Plan

| Phase | Task | Status |
|-------|------|--------|
| 1 | Create `TableEngine.js` (compute, rank, Q.D., AWM) | Done |
| 2 | Create `ClipboardEngine.js` (copy to clipboard) | Done |
| 3 | Fix Likert Copy All placeholder row index bug | Done |
| 4 | Add Recent Activity section to Dashboard | Done |
| 5 | Wire Profile, Likert, Summary to ClipboardEngine | Done |
| 6 | Add TableEngine/ClipboardEngine script tags | Done |

---

## 3. Reusable Component Structure

### JavaScript Modules
```
js/
├── interpretation-utils.js   (existing — openers, Q.D. display, implications)
├── text-generator.js         (existing — regenerate variations)
├── paste-table-utils.js      (existing — parse clipboard, map rows)
├── TableEngine.js            (NEW — computeRanks, getQualitativeDescription, computeAWM)
├── ClipboardEngine.js        (NEW — copyRichToClipboard)
├── profile.js
├── likert.js
└── summary.js
```

### HTML
- No shared Blade/partials (plain HTML/JS project)
- Each page includes: `interpretation-utils`, `text-generator`, `paste-table-utils`, `TableEngine`, `ClipboardEngine`, then page-specific JS

---

## 4. Reusable JavaScript Module Structure

### TableEngine.js
- `computeRanks(sortedByWm)` — average-of-positions for ties (Likert-style)
- `computeDenseRanks(rows, getFreq)` — dense rank map by index (Profile-style)
- `getQualitativeDescription(wm, mapping)` — map W.M. to Q.D. from scale
- `computeAWM(rows)` — average of weighted means
- `DEFAULT_QD_SCALE`, `LIKERT_5_FREQUENCY_SCALE` — standard scales

### ClipboardEngine.js
- `copyRichToClipboard(html, plain, showToast)` — write HTML + plain to clipboard
- `buildCopyPayload(tableTitle, tableHtml, tablePlain, interpretationText)` — build full copy payload
- `escapeHtml(s)` — safe HTML escaping

---

## 5. Updated Blade Integration Approach

N/A — this is a vanilla HTML/JS project. Integration is via script tags and global namespaces (`TableEngine`, `ClipboardEngine`).

---

## 6. How Dashboard, Profile, Likert, and Summary Connect

### Dashboard
- Reads `profileTables`, `likertTables`, `recentActivity` from localStorage
- Computes tables count, respondents, interpretations from stored data
- Renders Recent Activity into `#recent-activity-list` (now present in HTML)
- No direct dependency on TableEngine or ClipboardEngine

### Profile
- Uses `PasteTableUtils` for paste; `ClipboardEngine.copyRichToClipboard` for Copy All
- Keeps its own `computeDenseRanks` for two-group tables
- TableEngine available for future shared compute logic

### Likert
- Uses `PasteTableUtils` for paste; `ClipboardEngine.copyRichToClipboard` for Copy All
- Copy All sync fixed: uses `configIdx` instead of DOM `idx` when iterating rows to avoid placeholder-row misalignment
- TableEngine available for future shared Q.D./AWM logic

### Summary
- Uses `ClipboardEngine.copyRichToClipboard` for Copy All
- Reads profile/likert tables from localStorage; no table editing

---

## 7. Success Conditions Met

- [x] Profile manual table shows when "Create manual table" selected (unchanged, already worked)
- [x] Likert manual table shows on init when "Create manual table" selected (unchanged, already had init logic)
- [x] Paste feature uses shared PasteTableUtils (unchanged)
- [x] Copy All uses shared ClipboardEngine
- [x] Copy All includes final AWM/summary row (Likert/Profile build tfoot; bug was sync, not footer)
- [x] Likert Copy All placeholder row bug fixed
- [x] Dashboard Recent Activity section added and functional
