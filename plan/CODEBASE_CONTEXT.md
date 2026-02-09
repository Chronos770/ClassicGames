# Codebase Context - Key File Summaries

This document provides critical context about existing files that the implementation plan modifies or depends on. Read this before starting implementation.

## Quick Start
```bash
cd C:\ideas\05_game_platform
npm run dev    # Starts on port 3001
npm run build  # Production build (zero TS errors as of last check)
```

## Critical Files to Understand

### src/App.tsx (Router)
- Uses React Router v6 with BrowserRouter
- AnimatePresence for page transitions
- Routes: `/` (HomePage), `/lobby/:gameId` (GameLobby), `/play/{game}` (6 game pages)
- All routes wrapped in Layout component

### src/stores/settingsStore.ts
- Zustand with persist (`game-settings` key)
- Has `soundEnabled`, `musicEnabled`, `soundVolume` (0-1), `musicVolume` (0-1)
- Has `defaultDifficulty`, `animationSpeed` ('slow'|'normal'|'fast'), `showHints`
- Sound settings exist but are NOT wired to any actual audio - SoundManager (Phase 1) will read these

### src/stores/userStore.ts
- Zustand with persist (`user-data` key)
- `displayName: string` (default 'Player'), `isGuest: boolean` (default true)
- `stats: Record<string, { played, won, streak, bestStreak }>`
- `recordGame(gameId, won)` - updates local stats
- This store needs to be extended (Phase 9-10) to also sync to Supabase when authenticated

### src/stores/gameStore.ts
- NOT persisted
- `currentGame`, `phase` ('setup'|'playing'|'paused'|'finished'), `difficulty`, `score`, `moveCount`, `elapsed`, `isPaused`
- `reset()`, `setDifficulty()`, `setCurrentGame()`, `incrementMoves()`
- Needs new fields: `selectedOpponent` (Phase 6), `isMultiplayer`, `roomId` (Phase 13)

### src/engine/AnimationQueue.ts (UNUSED - Phase 2 activates it)
- Complete animation system, just never imported by any game
- `AnimationQueue` class with `add(animation)`, `addParallel(animations)`
- `Animation` interface: `{ id, duration, delay?, onStart?, onUpdate?(progress: 0-1), onComplete?, easing? }`
- `Easings` object with: `linear`, `easeInQuad`, `easeOutQuad`, `easeInOutQuad`, `easeOutCubic`, `easeInOutCubic`, `easeOutBack`, `easeOutBounce`
- Uses `requestAnimationFrame` loop with `performance.now()` timing

### src/renderer/PieceSprite.ts
- `createChessPiece(type, color, size)` - returns Container with Unicode chess symbol as Text
  - Symbols: white ♔♕♖♗♘♙, black ♚♛♜♝♞♟
  - Font size: 0.8 * cellSize, with shadow (2px offset)
  - Stroke for contrast
- `createCheckerPiece(color, isKing, size)` - returns Container with Graphics disc + optional crown

### src/renderer/BoardSprite.ts
- `createBoard(config)` - 8x8 grid with wood frame
- `CHESS_BOARD_CONFIG`: cellSize=70, lightColor=0xe8d5a8, darkColor=0x8b5e3c, borderWidth=16
- `CHECKERS_BOARD_CONFIG`: cellSize=70, lightColor=0xd4c8a0, darkColor=0x2d5a3d, borderWidth=16

### src/games/chess/ChessRenderer.ts (MOST MODIFIED FILE)
- Constructor: creates mainContainer, boardContainer, highlightsContainer, piecesContainer
- Board at position (50, 50) with 16px border, 70px cells = 560px board + 32px border = 592px, centered in 700px canvas
- Constants: `BOARD_X=50, BOARD_Y=50, CELL_SIZE=70, BORDER=16`
- `render(state: ChessGameState)`: clears highlights+pieces containers, rebuilds all
  - Draws selected square (yellow alpha 0.3)
  - Draws legal move indicators (green dots for moves, rings for captures)
  - Draws check highlight (red alpha 0.35) on king square
  - Creates piece sprites via `createChessPiece()` with hit areas for interaction
- `setOnMove(cb: (from: Square, to: Square) => void)`: click-to-move callback
- Internal `handleSquareClick(row, col)`: select piece -> show legal moves -> select target -> fire onMove
- `clearSelection()`: deselects, hides legal moves
- `showWin()`: creates WinCelebration effect
- `destroy()`: cleanup

### src/games/chess/ChessGame.ts
- Wraps `chess.js` Chess instance
- `initialize()`: new Chess() game
- `makeMove(from, to, promotion?)`: returns Move result or null
- `getLegalMoves(square)`: returns Move[] for a square
- `getBoard()`: 8x8 array of `{ type, color }` or null
- `getState()`: returns ChessGameState
- `getFEN()`: current FEN string
- `undo()`: pops undo stack (stored as FEN strings)
- `subscribe(listener)`: callback on state change

### src/games/chess/ChessPage.tsx
- 265 lines, well-structured with ref pattern
- Refs: canvasRef, appRef, gameRef, rendererRef, thinkingRef, difficultyRef, recordGameRef
- `handleGameOver(state)`: useCallback([]) - records game, sets modal
- `doAIMove(game, renderer)`: useCallback([handleGameOver]) - 300-800ms delay, calls AI, makes move
- useEffect([]) for init: creates Application (700x700), ChessGame, ChessRenderer
- `renderer.setOnMove(callback)` in init: handles player click-to-move
- UI below canvas: captured pieces (Unicode), move history (inline flex-wrap), undo/new game buttons
- GameOverModal at bottom

### src/games/chess/ChessAI.ts
- `getBestMove(state, difficulty)`: returns { from, to } using minimax
- Depths: easy=1 (30% random), medium=3 (10% random), hard=4
- `PIECE_VALUES`: p=100, n=320, b=330, r=500, q=900, k=20000
- Piece-square tables for pawns and knights
- Alpha-beta pruning

### src/games/chess/rules.ts
- `ChessGameState`: turn, isCheck, isCheckmate, isStalemate, isDraw, captured (per color), moveHistory (SAN string[])
- `ChessMoveResult`: type alias for chess.js Move (has from, to, san, captured, flags, etc.)
- `squareToCoords(square)`: 'a1' -> { row: 7, col: 0 }
- `coordsToSquare(row, col)`: { row: 7, col: 0 } -> 'a1'
- `getGameState(chess)`, `getLegalMoves(chess, square)`, `makeMove(chess, from, to, promo?)`

### src/ui/GameLobby.tsx
- Takes gameId from URL params
- Shows game name + description from GAME_NAMES/GAME_DESCRIPTIONS lookup
- 3 difficulty buttons (Easy, Medium, Hard) - selected is amber, others transparent
- "Start Game" calls reset(), setDifficulty(), setCurrentGame(), navigate to /play/{gameId}
- Skip difficulty for Solitaire
- This will be MAJORLY rewritten in Phase 6 (Named AIs) and Phase 13 (Multiplayer tab)

### src/ui/Layout.tsx
- Conditional header (hidden on /play/ routes)
- Logo: spade symbol in amber gradient box + "Premium Games" title
- Nav: "Games" link, "Settings" button (opens SettingsPanel modal)
- Main content: Outlet with framer-motion transitions
- Will need: UserMenu (Phase 9), Stats/Leaderboard links (Phase 10-11)

### src/ui/GameOverModal.tsx
- Props: isOpen, won, title, gameId, stats (label/value pairs), onPlayAgain
- Fixed overlay with backdrop blur
- Trophy/sad emoji, title, congrats/consolation message
- Stats grid (2 cols)
- Buttons: "Lobby" (navigates to /lobby/:gameId), "Play Again" (calls onPlayAgain)
- Will need: ELO change display (Phase 11)

### src/ui/HomePage.tsx
- GAMES array: 6 objects with { id, name, description, minPlayers, maxPlayers, hasAI, color }
- Renders grid of GameCard components (responsive: 1/2/3 cols)
- Each card links to /lobby/{id}

### src/ui/components/PlayerAvatar.tsx
- Props: name, isAI, isActive, size ('sm'|'md'|'lg')
- Shows initials (from name) or robot emoji (for AI)
- Active state: amber bg, ring highlight

### src/ui/components/ScoreBoard.tsx
- Props: players array (name, score, isAI, isCurrentPlayer)
- Glass panel with rows per player
- Active player highlighted

### src/styles/index.css
- CSS variables: --felt-green, --wood-medium, --gold, --gold-bright, etc.
- Classes: .btn-primary (gold gradient), .btn-secondary (transparent), .glass-panel (backdrop blur), .game-canvas-container (shadow)
- Background: dark gradient 135deg #0a0e1a -> #1a1f35 -> #0a0e1a

### src/renderer/effects/WinCelebration.ts
- `WinCelebration` class: constructor(container)
- 60 confetti particles with random colors, physics (gravity, damping)
- requestAnimationFrame loop, auto-cleanup
- `destroy()` method

## Package.json Dependencies
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.28.0",
  "pixi.js": "^8.6.6",
  "framer-motion": "^11.12.0",
  "zustand": "^5.0.1",
  "howler": "^2.2.4",
  "chess.js": "^1.0.0-beta.8"
}
```

Dev deps: typescript 5.6.3, vite 6.0.3, tailwindcss 3.4.16, @types/howler, @types/react, etc.
