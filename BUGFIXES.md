# Bug Fixes and Verification Log

This file records the **real** bugs found while building Operation Deep Blue, and separately the features that worked on the first attempt. No entries were invented to fill space. Problems with the build environment or tooling configuration are listed separately from bugs in the game code.

## Real bugs

### 1. Arrow-key navigation broke outside the first board row
- **Found by:** code review of `Board.jsx`, before the first browser session.
- **Symptom:** the grid ref used to find cells for arrow-key focus moves was attached to the first `<div role="row">` only. Searching for `[data-row][data-col]` inside it could only find cells in row A, so pressing ArrowDown from row A could not move focus anywhere.
- **Fix:** moved `ref={gridRef}` to the `.board-frame` element that contains every row.
- **Verified:** in Chrome via Playwright, focusing A1 and pressing →, →, ↓ moves focus to **B3**, and Enter fires there (`You fire at B3 — HIT!`, shots = 1).

### 2. Wrong test fixture in `stats.test.js`
- **Found by:** the first Vitest run (a failing test).
- **Symptom:** the debrief test expected `friendlyShipsRemaining: 4` after "sinking the destroyer", but the AI shots in the fixture landed on empty water, so no ship sank and the count stayed at 5. The bug was in the test data, not the game code.
- **Fix:** pointed the fixture shots at the destroyer's real cells (row 8).

### 3. Fast Refresh warning from a mixed export in `Dashboard.jsx`
- **Found by:** ESLint (`react-refresh/only-export-components`).
- **Symptom:** `Dashboard.jsx` exported both a component and the `turnStatus` helper. When a file mixes exports like this, Vite Fast Refresh does a full reload and component state is lost during development.
- **Fix:** moved `turnStatus` into `src/components/turnStatus.js`.

## Environment and tooling issues (not game bugs)

| Issue | Resolution |
| --- | --- |
| Node and npm were not installed on the build machine | Installed Node 20 with nvm |
| ESLint reported 70 `react/prop-types` errors (the template rule assumes runtime PropTypes) | Turned the rule off. This is a JavaScript project without PropTypes, and component contracts are covered by tests |

## Polish changes (not bugs)

- The sound toggle label was an emoji (🔊/🔇). How emoji render depends on the fonts installed on each OS, so it was replaced with an inline SVG speaker icon that looks the same everywhere.
- A `?seed=<n>` URL parameter was added so browser games can be reproduced exactly (used by the QA scripts below).

## Things checked that turned out not to be bugs

- **Possible horizontal overflow on mobile:** one screenshot taken right after shrinking the viewport from 1440 px to 390 px seemed to clip the title. Measurements after a fresh load at 320, 375, 390 and 768 px showed `scrollWidth === clientWidth` and no element past the viewport edge. The clipping was an artefact of resizing without reloading.
- **"Ship sunk" banner still showing during the next turn:** expected. The banner lasts about 1.9 s and does not block input.

## Features that worked on the first attempt (verified in a real browser)

Tested in Chrome through Playwright (CDP) against the Vite dev server, with **no console errors or page errors in any run**:

| Scenario | Result |
| --- | --- |
| Seeded victory (`?seed=777`, 17 targeted shots) | Every ship sank and was revealed. The victory finale played, then the debrief showed *Fleet Admiral*, 17/17 hits, 100%, 5/5 sunk, 3/5 friendly ships remaining |
| Defeat (firing only at water) | The AI sank the whole fleet in 56 turns. Defeat finale, then the debrief showed *Deckhand*, 0% accuracy, 0/5 friendly ships remaining |
| Full game with no known seed, driven only by what was visible in the DOM | Victory in 55 shots, 17 hits. Dashboard showed 55 shots / 31% accuracy, which matched the DOM count, and the debrief rank was *Ensign* |
| Rapid clicks (several clicks during the AI turn) | Exactly 1 shot registered, and the turn then returned to the player |
| New battle during the AI turn | Shots 0, integrity 100% and a fresh log. No stale AI shot reached the new game |
| Review Battlefield after the debrief | The board stayed visible and the debrief could be reopened |
| Reduced motion | The `reduced-motion` class was applied, shake and explosions were turned off, and the finale was shortened |
| Manual placement | The preview shows valid (teal) and invalid (red) positions, `R` rotates, and battle start is blocked until all five ships are placed |
| Keyboard play | Arrow keys and Enter fire correctly (see bug 1) |
| Responsive layout | Checked at 390 px (phone), 768 px (tablet) and 1440 px (desktop) |

Automated checks: 64 Vitest tests pass, ESLint is clean, and `vite build` succeeds.
