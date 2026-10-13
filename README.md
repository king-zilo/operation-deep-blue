# Operation Deep Blue

A browser-based Battleship game in which you take on **Admiral Byte**, a sarcastic AI naval commander. It's built with React and Vite and runs entirely in the browser. There's no backend, no account and no tracking.

## Features

- **Two 10×10 battle grids** with A–J / 1–10 labels. Enemy ships stay hidden until you hit them, and each ship is revealed in full once it sinks.
- **Fleet deployment:** both fleets are placed automatically. You can reshuffle, or clear the board and place ships yourself (pick a ship, press `R` to rotate, click to place, click a placed ship to pick it back up). Overlapping, out-of-bounds and diagonal placements are rejected, and the live preview shows invalid positions.
- **Turn-based combat:** you fire, then Admiral Byte fires once. Duplicate shots are rejected, the board locks during the enemy's turn, and the game stops the moment a fleet is destroyed.
- **Hunt-and-target AI** (details below). It never fires at the same cell twice.
- **Admiral Byte comms panel:** several predefined lines for every event (game start, your hit/miss/sink, its hit/miss/sink, victory, defeat), with no immediate repeats. No language model is used.
- **Command dashboard:** radar sweep, turn status, fleet integrity, enemy ships remaining, shots fired, accuracy, per-ship status for both fleets, and a scrolling combat log.
- **Effects:** hit explosions, miss ripples, "ship sunk" banners, screen shake, and victory and defeat finales you can skip.
- **Mission debrief:** outcome, shots, hits, accuracy, ships sunk and remaining, battle duration, a performance rank (Deckhand to Fleet Admiral) and Admiral Byte's assessment. Includes **Launch Another Battle** and **Review Battlefield** buttons.
- **Accessibility:** keyboard play (arrow keys and Enter/Space on the grids), ARIA labels on every cell, and `prefers-reduced-motion` support plus a manual Motion toggle (Auto / Full / Reduced).
- **Sound:** small synthesized Web Audio effects with no audio files. Sound is **muted by default**.
- **Responsive layout** for phones, tablets and desktops.

## Technology stack

| Concern | Choice |
| --- | --- |
| UI | React 18 (JavaScript) |
| Build / dev server | Vite 5 |
| Styling and animation | Plain CSS (custom properties, keyframes) |
| Tests | Vitest 2, jsdom, Testing Library |
| Linting | ESLint 9 |
| Sound | Web Audio API (synthesized) |

The only runtime dependencies are `react` and `react-dom`.

## Local setup

Requires **Node.js 18+** (developed on Node 20).

```bash
git clone <your-repo-url> operation-deep-blue
cd operation-deep-blue
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm test           # run the full test suite once
npm run test:watch # watch mode
npm run lint       # ESLint
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

**Deterministic games:** add `?seed=<number>` to the URL (for example `http://localhost:5173/?seed=777`) to get the same fleets and AI choices every time. This is useful for reproducing bugs and for scripted browser tests.

## How to play

1. **Deploy:** keep the auto-deployed fleet, press **Randomize**, or **Clear board** and place the five ships yourself (Carrier 5, Battleship 4, Cruiser 3, Submarine 3, Destroyer 2).
2. Press **Engage the enemy**.
3. Click a cell in **Enemy Waters**, or use the arrow keys and Enter, to fire. Orange X = hit, ripple = miss. A sunk ship is fully revealed.
4. Admiral Byte then fires at **Your Fleet**. Wait for "Your turn" before firing again.
5. Sink all five enemy ships before Byte sinks yours. Then read the debrief and launch another battle.

**New battle** in the header restarts at any time, including mid-turn.

## How the AI works

The AI code is in `src/engine/ai.js` and is deliberately simple and deterministic given a seed. It **only sees the results of its own shots** (`getAIView`). It never reads your ship positions.

1. **Hunt mode:** when there are no unresolved hits, it fires at a random untried cell on a checkerboard pattern. The smallest ship is 2 long, so every ship must cover at least one checkerboard cell. If those cells run out, it falls back to any untried cell.
2. **Target mode:** when it has a hit that doesn't belong to a sunk ship:
   - With a **single hit**, it tries the four orthogonal neighbours.
   - With **two or more aligned hits**, it extends the line from both ends until it reaches water or the edge.
   - If the line is blocked at both ends (for example, two adjacent ships were hit), it goes back to the neighbours of every open hit.
3. **Sunk:** that ship's cells stop counting as open hits. If no open hits remain, the AI returns to hunt mode.

Every candidate is filtered against cells it has already fired at, so the AI never repeats a shot. The tests check this by playing thousands of shots across many seeds.

## Tests

```bash
npm test
```

There are 64 tests across 7 files:

- `board.test.js`: placement validation, overlap and bounds rejection, random fleet placement across many seeds, sinking.
- `attack.test.js`: hit/miss/sunk resolution, duplicate rejection, immutability.
- `ai.test.js`: no repeated shots over full games, neighbour targeting after a hit, line extension, return to hunt after a sink, no access to hidden ships.
- `game.test.js`: turn sequencing, win/loss detection, no moves after game over, reset, stale AI moves from a previous game being ignored, manual placement rules.
- `stats.test.js` / `dialogue.test.js`: accuracy, ranks, debrief, no repeated dialogue lines.
- `App.test.jsx` (integration): full rendered games, rapid clicking during the AI turn, restarting mid-AI-turn, the game ending during an animation, reduced motion, and that sound is muted by default.

The game was also played through in a real browser with Playwright scripts. See [`BUGFIXES.md`](./BUGFIXES.md).

## Deployment (Vercel)

This is a static Vite site, and `vercel.json` sets the framework, build command and output directory.

1. Push the repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repo. The defaults (`npm run build`, output `dist`) are already correct.
3. Deploy. No environment variables are needed.

Or use the CLI: `npx vercel` (preview) and `npx vercel --prod`.

Any static host (Netlify, GitHub Pages, Cloudflare Pages) also works: run `npm run build` and serve `dist/`.

## Architecture

```
src/
  engine/            Pure, framework-free game logic (fully unit-tested)
    constants.js     Board size, fleet definitions, coordinate labels
    rng.js           Seeded Mulberry32 RNG (deterministic games/tests)
    board.js         Boards, placement validation, random fleet placement
    attack.js        Immutable attack resolution (miss / hit / sunk)
    ai.js            Hunt-and-target AI (sees only its own shot results)
    game.js          Reducer state machine: placement → battle → gameOver
    stats.js         Accuracy, ranks, debrief
    dialogue.js      Admiral Byte line pools + non-repeating picker
  hooks/
    useGame.js       Connects the reducer to React and schedules the AI turn
    useReducedMotion.js
  components/        Board, Dashboard, CommsPanel, PlacementPanel,
                     Banner, Finale, Debrief
  audio/sound.js     Synthesized Web Audio effects (non-fatal if unsupported)
  App.jsx            Composition, effects/sound side-effects, finale timing
  index.css          Visual identity, responsive layout, animations
```

**Design decisions:**

- **The game rules live in a pure reducer** (`gameReducer`). Every action (`PLAYER_FIRE`, `AI_FIRE`, `NEW_GAME`, …) checks the current phase and whose turn it is, so rapid clicks or out-of-turn shots are ignored by the reducer itself, not only by disabled buttons in the UI.
- **The AI turn is a cancellable timer tagged with a `gameId`.** If you restart while the AI is "thinking", the timer is cleared, and any action that still arrives is dropped because its `gameId` no longer matches.
- **Animations never block the game.** Effects are CSS reacting to state changes, and game-over is decided immediately, before the finale plays.
- **Randomness is injected** through a seeded RNG, so games, tests and bug reports can be reproduced exactly.
