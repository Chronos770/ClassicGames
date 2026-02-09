# Premium Game Platform - Feature Implementation Plan

## Project Context

This is a premium board & card game platform at `C:\ideas\05_game_platform\` with 6 fully playable games. All games have been thoroughly bug-audited and work correctly.

### Tech Stack
- **Vite 6** + **React 18** + **TypeScript 5.6**
- **PixiJS 8** for GPU-accelerated game canvas rendering
- **Zustand 5** with persist middleware for state management
- **Framer Motion 11** for UI animations/transitions
- **Tailwind CSS 3** for UI styling
- **Howler.js 2** (installed but UNUSED - no sound files or Howl instances exist)
- **chess.js 1** for chess rules/validation
- Dev server runs on port 3001 (`npm run dev`)

### Current Games (all working)
1. **Solitaire** (Klondike) - solo, drag-and-drop cards
2. **Chess** - vs AI (minimax, depth 1/3/4 by difficulty)
3. **Hearts** - 4-player trick-taking, 3 AI opponents
4. **Checkers** - vs AI (minimax + alpha-beta, depth 2/4/7)
5. **Gin Rummy** - 2-player draw/discard/meld vs AI
6. **Battleship** - ship placement + firing phases vs AI

### Key Architecture Patterns

**PixiJS Integration Pattern (every game page follows this):**
- `useRef` for canvas div, Application, Game instance, Renderer instance
- Single `useEffect([])` for one-time PixiJS init at mount
- `useRef` pattern to avoid stale closures in PixiJS callbacks
- `useCallback([])` for stable AI turn functions that read from refs
- Cleanup destroys renderer and app on unmount

**Renderer Pattern (every game renderer):**
- Constructor takes `Application`, creates `mainContainer` with felt/wood/ocean surface
- `render(state)` destroys all children except background, rebuilds all sprites from scratch
- `setOnCardClick` / `setOnCellClick` / `setOnMove` callback registration
- No persistent sprites, no animation - purely static re-render

**File Structure per game:**
```
src/games/{game}/
  rules.ts          - Types, validation, game rules
  {Game}Game.ts     - Game logic class (state, moves, undo)
  {Game}Renderer.ts - PixiJS rendering
  {Game}AI.ts       - AI opponent logic
  {Game}Page.tsx    - React page component
```

### Directory Structure
```
C:\ideas\05_game_platform\
  src/
    main.tsx, App.tsx (router)
    engine/
      types.ts          - Card, Suit, Rank, createDeck, shuffleDeck, rankValue
      BaseGame.ts       - Abstract game class with undo/redo, listeners
      AIPlayer.ts       - Abstract AI with difficulty, simulateThinking
      AnimationQueue.ts - UNUSED but complete: sequential/parallel anims, 8 easings
      InputHandler.ts   - UNUSED: drag/drop/click abstraction
    renderer/
      CardSprite.ts     - createCardGraphics(card, faceUp) -> Container (80x112px)
      BoardSprite.ts    - createBoard(config) for chess/checkers (70px cells, 16px border)
      PieceSprite.ts    - createChessPiece (Unicode), createCheckerPiece (Graphics)
      TableSurface.ts   - createFeltSurface, createWoodSurface, createOceanSurface
      effects/WinCelebration.ts - Confetti particle system
    stores/
      gameStore.ts      - currentGame, phase, difficulty, score, moveCount
      settingsStore.ts  - soundEnabled/volume, musicEnabled/volume, animationSpeed, showHints (persisted, but sound NOT wired)
      userStore.ts      - displayName, isGuest, per-game stats {played, won, streak, bestStreak} (persisted to localStorage)
    ui/
      Layout.tsx        - Header (shown when not in game), settings modal
      HomePage.tsx      - 6 game cards in responsive grid
      GameLobby.tsx     - Difficulty selection (easy/medium/hard), then /play/{game}
      GameOverModal.tsx - Win/loss modal with stats, play again
      SettingsPanel.tsx - Sound/music toggles, volume, animation speed, hints
      components/
        GameCard.tsx      - Animated game tile with icon, gradient
        PlayerAvatar.tsx  - Initials or robot emoji, sizes sm/md/lg
        ScoreBoard.tsx    - Glass panel with player scores
    games/ (6 game directories as described above)
    styles/index.css    - Tailwind + custom classes (btn-primary, btn-secondary, glass-panel, game-canvas-container)
```

### Canvas Sizes
| Game | Width | Height |
|------|-------|--------|
| Chess | 700 | 700 |
| Checkers | 720 | 650 |
| Solitaire | 700 | 700 |
| Hearts | 700 | 600 |
| Battleship | 750 | 550 |
| Rummy | 700 | 550 |

### Routes (src/App.tsx)
- `/` -> HomePage
- `/lobby/:gameId` -> GameLobby
- `/play/solitaire` -> SolitairePage (and similarly for all 6 games)

---

## Features to Implement

All features requested by the user, organized into 15 implementation phases.

---

## PHASE 1: Sound Infrastructure

**Goal**: Create a `SoundManager` singleton using Web Audio API for programmatic sound synthesis (no audio files needed).

### Create: `src/engine/SoundManager.ts`

Singleton class that:
- Reads `soundEnabled` and `soundVolume` from `useSettingsStore.getState()` (Zustand works outside React)
- Uses Web Audio API `AudioContext` to generate sounds programmatically
- Exposes `play(soundId: string)` method
- Has `Howl` override support for future file-based sounds

**Sound definitions to register:**

Chess: `chess-move` (short tone 200Hz), `chess-capture` (noise burst), `chess-check` (two ascending tones 440+880Hz), `chess-castle` (two quick tones), `chess-gameover` (chord C-E-G)

Cards: `card-deal` (short noise 40ms), `card-flip` (noise 60ms), `card-place` (soft click), `card-shuffle` (rapid noise bursts)

Board: `piece-click` (tone 300Hz 50ms), `piece-capture` (noise 100ms)

Battleship: `explosion` (low-freq burst), `splash` (high-freq noise)

UI: `ui-click` (tone 600Hz 30ms), `game-win` (chord C-E-G-C5), `game-lose` (descending chord)

**Implementation approach:**
- `playTone(freq, duration, oscillatorType, volume)`: OscillatorNode -> GainNode with exponential ramp
- `playNoise(duration, volume)`: Buffer of random samples for percussive effects
- `playChord(freqs[], duration, volume)`: Multiple simultaneous tones

---

## PHASE 2: Chess Smooth Piece Animations

**Goal**: Pieces slide smoothly from origin to destination instead of teleporting.

### Modify: `src/games/chess/ChessRenderer.ts`

**Strategy**: Approach (b) - create a temporary animation sprite that flies from old position to new position, then call full re-render. This avoids rearchitecting the entire renderer into a persistent-sprite model.

Add new members:
```typescript
private animationContainer: Container;  // between highlights and pieces in z-order
private animationQueue: AnimationQueue; // import from engine/AnimationQueue.ts
private isAnimating: boolean = false;
```

Add method `animateMove(fromSquare, toSquare, pieceType, pieceColor, onComplete)`:
1. Calculate pixel coords from square names using `squareToCoords` (existing in rules.ts)
2. Board position: `BOARD_X=50, BOARD_Y=50, BORDER=16, CELL_SIZE=70`
3. Create temporary piece sprite via `createChessPiece(type, color, CELL_SIZE)` from PieceSprite.ts
4. Add to `animationContainer` at source position
5. Use `AnimationQueue.add()` with `easeOutCubic` easing to tween x,y to destination
6. Duration from `settingsStore.animationSpeed`: fast=100ms, normal=200ms, slow=400ms
7. `onComplete`: remove animation sprite, set `isAnimating=false`, call the passed callback

Add `isAnimating` guard to click handler (ignore clicks during animation).

### Modify: `src/games/chess/ChessPage.tsx`

Change player move flow in `setOnMove` callback:
- Before `game.makeMove()`, capture the piece info from `game.getBoard()` at `from` square
- After `makeMove`, call `renderer.animateMove(from, to, piece.type, piece.color, () => { renderer.render(newState); /* then trigger AI or game over */ })`
- Do NOT call `renderer.render(newState)` immediately - let animation complete first

Same pattern for AI moves in `doAIMove`:
- Capture piece at `move.from` before making the move
- Animate, then render + handle game over in the callback

### Import: `src/engine/AnimationQueue.ts` (existing, currently unused)
- Has `Easings.easeOutCubic` and full animation lifecycle
- No changes needed to this file

---

## PHASE 3: Chess Sounds

**Goal**: Play sounds for moves, captures, checks, castles, game-over.

**Depends on**: Phase 1, Phase 2

### Modify: `src/games/chess/ChessPage.tsx`

Add sound determination logic:
```typescript
function getMoveSound(result: ChessMoveResult, newState: ChessGameState): string {
  if (newState.isGameOver) return 'chess-gameover';
  if (newState.isCheck) return 'chess-check';
  if (result.san.startsWith('O-')) return 'chess-castle';
  if (result.captured) return 'chess-capture';
  return 'chess-move';
}
```

Play sound in the animation `onComplete` callback for both player and AI moves:
```typescript
SoundManager.getInstance().play(getMoveSound(result, newState));
```

---

## PHASE 4: Chess Right-Click Arrows

**Goal**: Right-click drag to draw colored arrows on the board for planning (like chess.com).

### Create: `src/games/chess/ArrowOverlay.ts`

Class managing arrow drawing:
- `arrowsContainer: Container` added on top of pieces in z-order
- Tracks `arrows: { from: Square, to: Square, color: number }[]`
- Right-click down records start square, right-click up records end square, draws arrow
- Left-click anywhere clears all arrows
- Arrow colors: orange (default), green (shift), blue (ctrl), red (alt)
- Each arrow is a PixiJS `Graphics` with thick line (8px, alpha 0.7) and triangular arrowhead
- `clearAll()`, `destroy()` methods

**Arrow drawing math:**
- Center of square: `boardX + border + col * cellSize + cellSize/2`
- Line from center-of-from to center-of-to
- Arrowhead: triangle pointing in the direction of the line at the destination
- Use `atan2` for angle calculation

### Modify: `src/games/chess/ChessRenderer.ts`

- Instantiate `ArrowOverlay` in constructor, attach to `mainContainer` and `app.stage`
- In `render()`, do NOT clear arrows (they persist across re-renders)
- Clear arrows on `clearSelection()`
- Call `arrowOverlay.destroy()` in renderer's `destroy()`

### Modify: `src/games/chess/ChessPage.tsx`

- Suppress context menu: `canvas.addEventListener('contextmenu', e => e.preventDefault())`

---

## PHASE 5: Chess Move History Panel

**Goal**: Proper two-column algebraic notation panel replacing the current inline list.

### Create: `src/ui/components/MoveHistoryPanel.tsx`

React component with:
- 3-column grid: move number | white move | black move
- Moves grouped into pairs from the `moveHistory` array (SAN strings)
- Auto-scroll to bottom on new moves (useEffect + scrollIntoView)
- Glass-panel styling, max-height with overflow-y scroll
- Clickable moves (for future "go to position" feature)
- Font: monospace for alignment

### Modify: `src/games/chess/ChessPage.tsx`

- Replace the existing inline move history (lines ~224-236) with `<MoveHistoryPanel moves={state?.moveHistory ?? []} />`
- Adjust layout: on wide screens (`lg:`), put board and panel side by side; on narrow, stack vertically

---

## PHASE 6: Named AIs with Varying Difficulty

**Goal**: Named AI characters with personalities, avatars, and ELO estimates across all games.

### Create: `src/engine/AIPersonality.ts`

```typescript
interface AIPersonality {
  id: string;
  name: string;
  title: string;           // e.g. "The Rookie"
  avatar: string;          // Emoji
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  catchphrase: string;
  games: string[];         // ['*'] for all, or specific game IDs
  eloEstimate: number;
}
```

**AI Roster (6 characters):**

| ID | Name | Title | Avatar | Diff | ELO | Games |
|----|------|-------|--------|------|-----|-------|
| beginner-bob | Beginner Bob | The Rookie | Boy emoji | easy | 400 | * |
| casual-carol | Casual Carol | Weekend Player | Woman emoji | easy | 600 | * |
| steady-sam | Steady Sam | Club Player | Graduate emoji | medium | 1000 | * |
| tactical-tina | Tactical Tina | Sharp Attacker | Technologist emoji | medium | 1200 | chess, checkers, battleship |
| expert-eve | Expert Eve | Tournament Champion | Crown emoji | hard | 1800 | * |
| grandmaster-greg | Grandmaster Greg | The Unbeatable | Wizard emoji | hard | 2200 | chess, checkers |

Export `getAIsForGame(gameId: string): AIPersonality[]`

### Modify: `src/ui/GameLobby.tsx` - Major rewrite

Replace 3 difficulty buttons with AI opponent selection grid:
- Show available AIs for the selected game (from `getAIsForGame`)
- Each AI card shows: emoji avatar, name, title, description, ELO estimate
- Selected AI highlighted with amber border
- Start game sets difficulty from selected AI

### Modify: `src/stores/gameStore.ts`

Add: `selectedOpponent: AIPersonality | null`, `setSelectedOpponent()`

### Modify: All game pages (chess, checkers, hearts, rummy, battleship)

- Read `selectedOpponent` from gameStore
- Display AI name and avatar in the header area where it currently says "AI thinking..."
- Show catchphrase in GameOverModal

---

## PHASE 7: Sounds for ALL Games

**Goal**: Hook SoundManager into every game.

**Depends on**: Phase 1

### Modify: `src/games/checkers/CheckersPage.tsx`
- `piece-click` on piece selection
- `board-move` on normal move
- `piece-capture` on jump
- `game-win` / `game-lose` on finish

### Modify: `src/games/hearts/HeartsPage.tsx`
- `card-deal` on init
- `card-flip` on playing a card
- `piece-capture` on collecting trick with points
- `game-win` / `game-lose` on finish

### Modify: `src/games/solitaire/SolitairePage.tsx`
- `card-flip` on revealing tableau card
- `card-deal` on drawing from stock
- `card-place` on placing to foundation/tableau
- `game-win` on completing

### Modify: `src/games/battleship/BattleshipPage.tsx`
- `piece-click` on cell selection
- `explosion` on hit
- `splash` on miss
- `game-win` / `game-lose` on finish

### Modify: `src/games/rummy/RummyPage.tsx`
- `card-deal` on draw
- `card-flip` on discard
- `card-place` on meld/knock
- `game-win` / `game-lose` on finish

---

## PHASE 8: Supabase Infrastructure

**Goal**: Set up Supabase client and database schema.

### Install: `npm install @supabase/supabase-js`

### Create: `.env.example`
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Create: `src/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
```

Note: supabase client is null when env vars not set, allowing the app to work without Supabase in development.

### Create: `supabase/migrations/001_initial_schema.sql`

**Tables:**

1. **profiles** (extends auth.users)
   - id (UUID, FK to auth.users), display_name, avatar_url, avatar_emoji, created_at, updated_at

2. **game_stats** (per user per game)
   - id, user_id (FK), game_id (text), played, won, lost, drawn, streak, best_streak, total_time_seconds, updated_at
   - UNIQUE(user_id, game_id)

3. **elo_ratings** (per user per game)
   - id, user_id (FK), game_id, rating (default 1200), peak_rating, games_rated, updated_at
   - UNIQUE(user_id, game_id)

4. **matches** (game history)
   - id, game_id, player1_id, player2_id (null for AI), ai_opponent (text), winner_id, result, elo_before/after for both players, move_count, duration_seconds, metadata (JSONB), created_at

5. **rooms** (multiplayer)
   - id, game_id, host_id, guest_id, status ('waiting'|'playing'|'finished'), game_state (JSONB), created_at, updated_at

6. **chat_messages**
   - id, room_id (FK), user_id (FK), message, created_at

**RLS Policies:**
- profiles: anyone can read, users update own
- game_stats: anyone can read, users modify own
- elo_ratings: anyone can read, users modify own
- matches: anyone can read, participants can insert
- rooms: anyone can read, host creates, participants update
- chat: room participants can read/write

**Trigger:** Auto-create profile row on auth.users insert

---

## PHASE 9: User Accounts & Login

**Goal**: Supabase Auth with email + Google. Guest play by default.

**Depends on**: Phase 8

### Create: `src/stores/authStore.ts`

Zustand store with:
- `user`, `session`, `isLoading`, `isGuest`
- `initialize()` - check existing session, set up auth state listener
- `signInWithEmail(email, password)`
- `signUpWithEmail(email, password, name)`
- `signInWithGoogle()` - OAuth redirect
- `signOut()`

### Create: `src/ui/AuthModal.tsx`

Modal with tabs: Login | Sign Up
- Email/password form for both
- Google OAuth button
- "Continue as Guest" button
- Glass-panel styling matching SettingsPanel

### Create: `src/ui/UserMenu.tsx`

Header component:
- When guest: "Sign In" button
- When logged in: avatar + name dropdown with Profile, Stats, Sign Out

### Modify: `src/ui/Layout.tsx`
- Add `<UserMenu />` to header nav

### Modify: `src/main.tsx`
- Call `useAuthStore.getState().initialize()` before render

### Modify: `src/stores/userStore.ts`
- In `recordGame()`: if authenticated, also sync to Supabase `game_stats` table

---

## PHASE 10: Game Statistics & Persistence

**Goal**: Cross-device stats via Supabase. Merge localStorage stats on first sign-in.

**Depends on**: Phase 8, 9

### Create: `src/lib/statsService.ts`

Functions:
- `fetchUserStats(userId)` - get all game_stats rows
- `upsertGameStats(userId, gameId, stats)` - upsert stats row
- `mergeLocalStats(userId, localStats)` - on first login, merge localStorage stats with remote (take max of each value)

### Create: `src/ui/StatsPage.tsx`

New route `/stats` showing:
- Per-game cards with: games played, win rate %, current streak, best streak
- Simple CSS bar charts (no charting library)

### Modify: `src/App.tsx` - Add `/stats` route
### Modify: `src/ui/Layout.tsx` - Add "Stats" nav link

---

## PHASE 11: ELO Ratings & Rankings

**Goal**: Per-game ELO system with leaderboards.

**Depends on**: Phase 8, 9, 10

### Create: `src/lib/eloService.ts`

Functions:
- `calculateNewElo(playerElo, opponentElo, result)` - Standard ELO formula, K=32
- `updateEloAfterGame(userId, gameId, opponentElo, result)` - Fetch current, calculate new, upsert
- `getLeaderboard(gameId, limit=50)` - Top players by rating with profile info

### Create: `src/ui/LeaderboardPage.tsx`

New route `/leaderboard`:
- Tabs for each game
- Table: rank, avatar, name, ELO, peak ELO, games played
- Highlight current user row

### Modify: `src/App.tsx` - Add `/leaderboard` route
### Modify: `src/ui/Layout.tsx` - Add "Leaderboard" nav link
### Modify: `src/ui/GameOverModal.tsx` - Show ELO change ("+15 ELO" / "-8 ELO") when authenticated
### Modify: All game pages - Call `updateEloAfterGame` with AI's `eloEstimate` after recording result

---

## PHASE 12: User Avatars

**Goal**: Avatar selection (emoji or image upload).

**Depends on**: Phase 8, 9

### Create: `src/ui/AvatarPicker.tsx`

Two modes:
1. Emoji grid (~30 pre-selected emojis) -> stores in `profiles.avatar_emoji`
2. Image upload -> Supabase Storage `avatars` bucket -> stores URL in `profiles.avatar_url`

### Create: `src/ui/ProfilePage.tsx`

Route `/profile`:
- Editable display name
- Avatar picker
- Stats summary
- ELO ratings per game

### Modify: `src/ui/components/PlayerAvatar.tsx`
- Support `avatarUrl` (render `<img>`) and `avatarEmoji` (render emoji text)
- Fallback to initials

### Modify: `src/App.tsx` - Add `/profile` route

---

## PHASE 13: Multiplayer

**Goal**: Real-time game sync via Supabase Realtime for 2-player games.

**Depends on**: Phase 8, 9

### Create: `src/lib/multiplayerService.ts`

Class `MultiplayerService`:
- `createRoom(gameId, hostId)` - insert room row, subscribe to channel
- `joinRoom(roomId, guestId)` - update guest_id, subscribe
- `sendMove(move)` - broadcast on channel `room:{roomId}`
- `setHandlers({ onMoveReceived, onPlayerJoined, onPlayerLeft })`
- `leaveRoom()` - broadcast leave, unsubscribe
- `getOpenRooms(gameId)` - query waiting rooms

Uses Supabase Realtime channels for broadcasting moves as arbitrary JSON payloads.

### Create: `src/ui/MultiplayerLobby.tsx`

Shows:
- "Create Room" button -> generates room, shows waiting screen with shareable code/link
- "Join Room" with code input
- List of open rooms to join

### Modify: `src/ui/GameLobby.tsx`

Add two tabs: "vs AI" (current flow with Named AIs) | "vs Human" (MultiplayerLobby)

### Modify: `src/stores/gameStore.ts`

Add: `isMultiplayer`, `roomId`, `setMultiplayer()`

### Modify: `src/App.tsx` - Add `/room/:roomId` route for join links

### Modify: Game pages (chess, checkers, rummy, battleship)

Add multiplayer mode:
- If `isMultiplayer`, replace AI logic with broadcast listener
- On player move: `multiplayerService.sendMove({ from, to })` instead of triggering AI
- On receiving move: apply to local game instance, animate, render
- Lock board when not local player's turn

---

## PHASE 14: In-Game Chat

**Goal**: Real-time chat in multiplayer games.

**Depends on**: Phase 13

### Create: `src/ui/components/ChatPanel.tsx`

Collapsible side panel:
- Subscribe to Supabase Realtime channel `chat:{roomId}`
- Load recent messages from DB on mount
- Send messages via broadcast + insert to `chat_messages` table
- Scrollable message list with input bar
- Glass-panel styling

### Modify: All multiplayer game pages
- Show `<ChatPanel />` beside game board when in multiplayer mode

---

## PHASE 15: Hosting/Publishing

**Goal**: Deploy to Vercel or Netlify.

### Create: `vercel.json`
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

### Create: `public/_redirects` (Netlify fallback)
```
/*    /index.html   200
```

### Deployment Steps:
1. Push to GitHub
2. Connect to Vercel (or Netlify)
3. Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Build: `npm run build`, output: `dist/`
5. Configure Supabase Google OAuth redirect URL to production domain

---

## Implementation Order & Dependencies

```
PHASE 1:  Sound Infrastructure          [no deps]
PHASE 2:  Chess Animations              [no deps]
PHASE 3:  Chess Sounds                  [1, 2]
PHASE 4:  Chess Arrows                  [2]
PHASE 5:  Move History Panel            [no deps]
PHASE 6:  Named AIs                     [no deps]
PHASE 7:  All Game Sounds               [1]
PHASE 8:  Supabase Schema               [no deps]
PHASE 9:  User Accounts                 [8]
PHASE 10: Stats Persistence             [8, 9]
PHASE 11: ELO & Leaderboards            [8, 9, 10]
PHASE 12: User Avatars                  [8, 9]
PHASE 13: Multiplayer                   [8, 9]
PHASE 14: Chat                          [13]
PHASE 15: Hosting                       [any time]
```

**Parallel tracks:**
- Track A (client-side): Phases 1-7 (independent of backend)
- Track B (infrastructure): Phase 8 (can start in parallel)
- Track C (accounts/social): Phases 9-14 (need Phase 8)

---

## Verification

After each phase:
1. `npx tsc --noEmit` - zero TypeScript errors
2. `npm run build` - production build succeeds
3. Manual testing of the modified feature in browser at `http://localhost:3001`

After all phases:
- All 6 games playable with sounds and animations
- AI opponents selectable by name in lobby
- Chess has smooth piece sliding, arrow drawing, move history panel
- Optional Supabase login with persistent stats and ELO
- Multiplayer working for 2-player games
- Chat functional in multiplayer
- Deployable to Vercel/Netlify
