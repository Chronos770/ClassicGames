import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Application } from 'pixi.js';
import { motion } from 'framer-motion';
import { Card } from '../../engine/types';
import { HeartsGame } from './HeartsGame';
import { HeartsRenderer } from './HeartsRenderer';
import { HeartsState } from './rules';
import { selectPassCards, selectPlay } from './HeartsAI';
import {
  HeartsOpponent,
  HeartsComment,
  pickOpponents,
  commentOnPass,
  commentOnTrickWon,
  commentOnHeartsBroken,
  commentOnQueenPlayed,
  commentOnRoundOver,
  commentOnGameOver,
} from './HeartsCommentary';
import { useUserStore } from '../../stores/userStore';
import { useAuthStore } from '../../stores/authStore';
import { useGameStore } from '../../stores/gameStore';
import { SoundManager } from '../../engine/SoundManager';
import { MultiplayerGameAdapter } from '../../lib/multiplayerGameAdapter';
import { multiplayerService } from '../../lib/multiplayerService';
import GameOverModal from '../../ui/GameOverModal';

function hexToCSS(hex: number): string {
  return '#' + hex.toString(16).padStart(6, '0');
}

function PlayerCard({ opp, score, roundScore, cards, horizontal }: {
  opp: HeartsOpponent;
  score: number;
  roundScore: number;
  cards: number;
  horizontal?: boolean;
}) {
  return (
    <div className={`flex ${horizontal ? 'flex-row' : 'flex-col'} items-center gap-1.5 bg-white/5 rounded-lg px-3 py-2`}>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm border-2"
        style={{ backgroundColor: hexToCSS(opp.color), borderColor: 'rgba(255,255,255,0.3)' }}
      >
        {opp.initial}
      </div>
      <div className={`${horizontal ? 'text-left' : 'text-center'}`}>
        <div className="text-xs text-white/70 font-medium">{opp.name}</div>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-white">{score}</span>
          {roundScore > 0 && <span className="text-[10px] text-red-400">+{roundScore}</span>}
        </div>
      </div>
      <div className="text-[10px] text-white/30">{cards} cards</div>
    </div>
  );
}

/** Rotate a HeartsState so that `mySeat` appears as player 0 (bottom) */
function rotateStateForSeat(state: HeartsState, mySeat: number): HeartsState {
  if (mySeat === 0) return state;
  const r = (i: number) => (mySeat + i) % 4;
  return {
    ...state,
    hands: [0, 1, 2, 3].map((i) => state.hands[r(i)]),
    scores: [0, 1, 2, 3].map((i) => state.scores[r(i)]),
    totalScores: [0, 1, 2, 3].map((i) => state.totalScores[r(i)]),
    currentTrick: [0, 1, 2, 3].map((i) => state.currentTrick[r(i)]) as (Card | null)[],
    tricks: [0, 1, 2, 3].map((i) => state.tricks[r(i)]),
    passingCards: [0, 1, 2, 3].map((i) => state.passingCards[r(i)]),
    currentPlayer: (state.currentPlayer - mySeat + 4) % 4,
    trickLeader: (state.trickLeader - mySeat + 4) % 4,
  };
}

// Seat colors for multiplayer avatars
const SEAT_COLORS: number[] = [0xf59e0b, 0x3b82f6, 0xef4444, 0x22c55e];
const SEAT_LABELS = ['South', 'West', 'North', 'East'];

export default function HeartsPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gameRef = useRef<HeartsGame | null>(null);
  const rendererRef = useRef<HeartsRenderer | null>(null);
  const adapterRef = useRef<MultiplayerGameAdapter | null>(null);
  const bubbleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Store
  const isMultiplayer = useGameStore((s) => s.isMultiplayer);
  const playerColor = useGameStore((s) => s.playerColor);
  const storeSeat = useGameStore((s) => s.playerSeat);
  const roomId = useGameStore((s) => s.roomId);
  const inviteCode = useGameStore((s) => s.inviteCode);
  const setPlayerSeat = useGameStore((s) => s.setPlayerSeat);
  const recordGame = useUserStore((s) => s.recordGame);

  const isHost = isMultiplayer && playerColor === 'w';

  // Local state
  const [state, setState] = useState<HeartsState | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [gameOver, setGameOver] = useState(false);
  const [playerWon, setPlayerWon] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [mySeat, setMySeat] = useState(isMultiplayer ? (isHost ? 0 : -1) : 0);
  const [gameStarted, setGameStarted] = useState(!isMultiplayer);
  const [lobbyPlayerIds, setLobbyPlayerIds] = useState<(string | null)[]>(
    isHost ? ['host', null, null, null] : [null, null, null, null]
  );
  const [seatNames, setSeatNames] = useState<string[]>(() => {
    if (isMultiplayer && isHost) {
      const profile = useAuthStore.getState().profile;
      return [profile?.display_name || 'Host', 'Empty', 'Empty', 'Empty'];
    }
    return ['Host', 'Empty', 'Empty', 'Empty'];
  });
  const opponentsRef = useRef<HeartsOpponent[]>([]);
  const myUserIdRef = useRef<string>('');
  const seatNamesRef = useRef<string[]>(seatNames);
  const pendingStateRef = useRef<HeartsState | null>(null);
  const animatingRef = useRef(false);

  // Stable refs
  const selectedCardsRef = useRef<Set<string>>(selectedCards);
  useEffect(() => { selectedCardsRef.current = selectedCards; }, [selectedCards]);
  const recordGameRef = useRef(recordGame);
  useEffect(() => { recordGameRef.current = recordGame; }, [recordGame]);
  const mySeatRef = useRef(mySeat);
  useEffect(() => { mySeatRef.current = mySeat; }, [mySeat]);
  const prevScoresRef = useRef<number[]>([0, 0, 0, 0]);
  const stateRef = useRef<HeartsState | null>(null);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { seatNamesRef.current = seatNames; }, [seatNames]);

  // ── Commentary bubble ──────────────────────────────────────
  const showBubble = useCallback((comment: HeartsComment | null) => {
    if (!comment || isMultiplayer) return; // disable bubbles in multiplayer
    if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
    rendererRef.current?.showBubble(comment);
    bubbleTimerRef.current = setTimeout(() => {
      rendererRef.current?.clearBubble();
      bubbleTimerRef.current = null;
    }, 3000);
  }, [isMultiplayer]);

  // ── AI helpers (single-player only) ────────────────────────
  const aiPassCards = useCallback((game: HeartsGame) => {
    for (let i = 1; i < 4; i++) {
      const s = game.getState();
      const cards = selectPassCards(s.hands[i]);
      for (const card of cards) game.selectPassCard(i, card);
    }
  }, []);

  const aiPlayTurn = useCallback(async (game: HeartsGame) => {
    const s = game.getState();
    if (s.phase !== 'playing' || s.currentPlayer === 0) return;

    await new Promise((r) => setTimeout(r, 400));

    const current = game.getState();
    if (current.phase !== 'playing' || current.currentPlayer === 0) return;

    const card = selectPlay(current, current.currentPlayer);
    if (card) {
      const heartsBefore = current.heartsBroken;

      game.playCard(current.currentPlayer, card);
      SoundManager.getInstance().play('card-flip');
      const newState = game.getState();

      if (!heartsBefore && newState.heartsBroken) showBubble(commentOnHeartsBroken());
      if (card.suit === 'spades' && card.rank === 'Q') {
        showBubble(commentOnQueenPlayed(current.currentPlayer, -1));
      }

      const completedTrick = game.getLastCompletedTrick();
      if (completedTrick) {
        // Show trick with all 4 cards visible before clearing
        const displayS = { ...newState, currentTrick: completedTrick.cards as (Card | null)[] };
        setState({ ...displayS });
        rendererRef.current?.render(displayS, new Set());
        const winner = completedTrick.winner;
        const pts = completedTrick.points;
        const winnerName = winner === 0 ? 'You' : (opponentsRef.current[winner - 1]?.name || 'Opponent');
        setMessage(`${winnerName} took the trick${pts > 0 ? ` (+${pts} pts)` : ''}`);
        if (pts > 0) rendererRef.current?.showFloatingPoints(winner, pts);
        showBubble(commentOnTrickWon(winner, pts));

        await new Promise((r) => setTimeout(r, 1200));
        game.clearLastCompletedTrick();
        setState({ ...newState });
        rendererRef.current?.render(newState, new Set());
        setMessage('');
      } else {
        setState({ ...newState });
        rendererRef.current?.render(newState, new Set());
      }

      const latestState = game.getState();
      if (latestState.phase === 'playing' && latestState.currentPlayer !== 0) {
        aiPlayTurn(game);
      } else if (latestState.phase === 'round-over') {
        setMessage('Round over! Click "Next Round" to continue.');
        showBubble(commentOnRoundOver(latestState.scores));
      } else if (latestState.phase === 'game-over') {
        const winner = game.getWinner();
        setGameOver(true);
        SoundManager.getInstance().play(winner === 0 ? 'game-win' : 'game-lose');
        recordGameRef.current('hearts', winner === 0, 'AI');
        showBubble(commentOnGameOver(latestState.totalScores));
      }
    }
  }, [showBubble]);

  // ── Host: AI play for unfilled multiplayer seats ───────────
  const hostAiPlayRef = useRef<(game: HeartsGame, aiSeats: Set<number>) => Promise<void>>();
  hostAiPlayRef.current = async (game: HeartsGame, aiSeats: Set<number>) => {
    let s = game.getState();
    while (s.phase === 'playing' && aiSeats.has(s.currentPlayer)) {
      await new Promise((r) => setTimeout(r, 400));
      s = game.getState();
      if (s.phase !== 'playing' || !aiSeats.has(s.currentPlayer)) break;
      const card = selectPlay(s, s.currentPlayer);
      if (card) {
        const playingSeat = s.currentPlayer;
        game.playCard(s.currentPlayer, card);
        SoundManager.getInstance().play('card-flip');
        s = game.getState();

        // Broadcast card-played event for animation on non-host
        broadcastEvent({ type: 'card-played', seat: playingSeat, card });

        const completedTrick = game.getLastCompletedTrick();
        if (completedTrick) {
          // Show trick with cards visible before clearing
          const displayS = { ...s, currentTrick: completedTrick.cards as (Card | null)[] };
          setState({ ...displayS });
          const rotated = rotateStateForSeat(displayS, mySeatRef.current);
          rendererRef.current?.render(rotated, new Set());
          adapterRef.current?.sendMove({ type: 'game-state', state: displayS });

          const winner = completedTrick.winner;
          const trickPts = completedTrick.points;
          const rotatedWinner = (winner - mySeatRef.current + 4) % 4;
          if (trickPts > 0) {
            rendererRef.current?.showFloatingPoints(rotatedWinner, trickPts);
          }
          const winnerName = getSeatDisplayName(winner);
          setMessage(`${winnerName} took the trick${trickPts > 0 ? ` (+${trickPts} pts)` : ''}`);
          broadcastEvent({ type: 'trick-won', winner, points: trickPts });
          await new Promise((r) => setTimeout(r, 1500));
          setMessage('');
          game.clearLastCompletedTrick();
          broadcastState(game);
        } else {
          broadcastState(game);
        }
      } else break;
    }
    // Check end conditions and update turn message
    s = game.getState();
    if (s.phase === 'round-over') {
      setMessage('Round over!');
      broadcastState(game);
    } else if (s.phase === 'game-over') {
      setGameOver(true);
      broadcastState(game);
    } else if (s.phase === 'playing') {
      // Update turn message for host
      if (s.currentPlayer === mySeatRef.current) {
        setMessage('Your turn \u2014 play a card');
      } else {
        const name = getSeatDisplayName(s.currentPlayer);
        setMessage(`Waiting for ${name}...`);
      }
    }
  };

  // ── Multiplayer: broadcast state (host only) ───────────────
  const broadcastState = useCallback((game: HeartsGame) => {
    const s = game.getState();
    setState({ ...s });
    const seat = mySeatRef.current;
    const rotated = rotateStateForSeat(s, seat);
    rendererRef.current?.render(rotated, new Set());
    adapterRef.current?.sendMove({ type: 'game-state', state: s });
  }, []);

  /** Host sends an event message to trigger animations/feedback on non-host */
  const broadcastEvent = useCallback((event: Record<string, any>) => {
    adapterRef.current?.sendMove(event);
  }, []);

  /** Get display name for a seat (rotated for local display) */
  const getSeatDisplayName = useCallback((absoluteSeat: number): string => {
    const names = seatNamesRef.current;
    if (absoluteSeat === mySeatRef.current) return 'You';
    return names[absoluteSeat] || `Player ${absoluteSeat + 1}`;
  }, []);

  // Track which seats are AI (for host)
  const aiSeatsRef = useRef<Set<number>>(new Set());

  // ── Helper: apply remote state on non-host ─────────────────
  const applyRemoteState = useCallback((s: HeartsState) => {
    // Detect trick completion: check if any player's round score increased
    const prev = prevScoresRef.current;
    for (let i = 0; i < 4; i++) {
      const gained = s.scores[i] - prev[i];
      if (gained > 0) {
        const rotatedIdx = (i - mySeatRef.current + 4) % 4;
        rendererRef.current?.showFloatingPoints(rotatedIdx, gained);
      }
    }
    prevScoresRef.current = [...s.scores];
    setState({ ...s });
    const rotated = rotateStateForSeat(s, mySeatRef.current);
    // Preserve card selection during passing phase
    const sel = s.phase === 'passing' ? selectedCardsRef.current : new Set<string>();
    rendererRef.current?.render(rotated, sel);

    if (s.phase === 'round-over') {
      setMessage('Round over!');
    } else if (s.phase === 'game-over') {
      setGameOver(true);
      const winner = s.totalScores.indexOf(Math.min(...s.totalScores));
      SoundManager.getInstance().play(winner === mySeatRef.current ? 'game-win' : 'game-lose');
      recordGameRef.current('hearts', winner === mySeatRef.current, 'Opponent');
    } else if (s.phase === 'playing') {
      // Turn message
      if (s.currentPlayer === mySeatRef.current) {
        // Check for 2 of clubs on first trick of round
        const isFirstTrick = s.tricks.every((t) => t.length === 0);
        const trickEmpty = s.currentTrick.every((c) => c === null);
        if (isFirstTrick && trickEmpty) {
          setMessage('Your turn \u2014 lead with the 2 of Clubs!');
        } else {
          setMessage('Your turn \u2014 play a card');
        }
      } else {
        const name = seatNamesRef.current[s.currentPlayer] || `Player ${s.currentPlayer + 1}`;
        // Check for 2 of clubs notification on first trick
        const isFirstTrick = s.tricks.every((t) => t.length === 0);
        const trickEmpty = s.currentTrick.every((c) => c === null);
        if (isFirstTrick && trickEmpty) {
          setMessage(`${name} leads with the 2 of Clubs`);
        } else {
          setMessage(`Waiting for ${name}...`);
        }
      }
    } else if (s.phase === 'passing') {
      setMessage('Select 3 cards to pass');
    }
  }, []);

  // ── Multiplayer message handler ────────────────────────────
  const handleRemoteMessageRef = useRef<(data: any) => void>();
  handleRemoteMessageRef.current = (data: any) => {
    const game = gameRef.current;

    if (data.type === 'resign') {
      // A player resigned
      setPlayerWon(true);
      setGameOver(true);
      SoundManager.getInstance().play('game-win');
      recordGameRef.current('hearts', true, 'Opponent');
      return;
    } else if (data.type === 'room-full') {
      // Room is full, navigate back
      setMessage('Room is full. Returning to lobby...');
      setTimeout(() => navigate('/lobby/hearts'), 1500);
      return;
    } else if (data.type === 'player-info') {
      // A new player announces themselves
      if (isHost) {
        setLobbyPlayerIds((prev) => {
          const next = [...prev];
          // Deduplicate: if this userId is already seated, ignore
          if (next.includes(data.userId)) return prev;
          // Find first empty seat
          const emptySeat = next.findIndex((p, i) => i > 0 && p === null);
          if (emptySeat === -1) {
            // Room full, tell them
            adapterRef.current?.sendMove({ type: 'room-full' });
            return prev;
          }
          next[emptySeat] = data.userId;
          // Update names and broadcast with all names so late joiners see everyone
          setSeatNames((names) => {
            const n = [...names];
            n[emptySeat] = data.name || `Player ${emptySeat + 1}`;
            adapterRef.current?.sendMove({
              type: 'seat-assign',
              userId: data.userId,
              seat: emptySeat,
              allSeats: next,
              allNames: n,
            });
            return n;
          });
          return next;
        });
      }
    } else if (data.type === 'seat-assign') {
      // Host tells a player their seat
      if (!isHost) {
        // Only accept our own seat assignment (compare with our userId)
        if (data.userId === myUserIdRef.current && mySeatRef.current === -1) {
          setMySeat(data.seat);
          setPlayerSeat(data.seat);
          mySeatRef.current = data.seat;
        }
        // Update lobby display
        setLobbyPlayerIds(data.allSeats || []);
        // Update all seat names from host
        if (data.allNames) {
          setSeatNames(data.allNames);
        }
      }
    } else if (data.type === 'start-game') {
      // Host started the game
      if (!isHost) {
        setGameStarted(true);
        if (data.seatNames) setSeatNames(data.seatNames);
        aiSeatsRef.current = new Set(data.aiSeats || []);
      }
    } else if (data.type === 'deal-start') {
      // Host is dealing — play deal animation on non-host, queue state
      if (!isHost) {
        animatingRef.current = true;
        pendingStateRef.current = null;
        const handSizes: number[] = data.handSizes || [13, 13, 13, 13];
        rendererRef.current?.playDealAnimation(handSizes, () => {
          SoundManager.getInstance().play('card-deal');
          animatingRef.current = false;
          // Apply any queued state
          if (pendingStateRef.current) {
            const s = pendingStateRef.current;
            pendingStateRef.current = null;
            applyRemoteState(s);
          }
        });
      }
    } else if (data.type === 'card-played') {
      // Host says a card was played — animate on non-host
      if (!isHost && rendererRef.current) {
        const absoluteSeat: number = data.seat;
        const card: Card = data.card;
        const rotatedSeat = (absoluteSeat - mySeatRef.current + 4) % 4;
        rendererRef.current.animateCardToTrick(rotatedSeat, card);
        SoundManager.getInstance().play('card-flip');
      }
    } else if (data.type === 'trick-won') {
      // Host says a trick was won — show message on non-host
      if (!isHost) {
        const winner: number = data.winner;
        const points: number = data.points;
        const rotatedWinner = (winner - mySeatRef.current + 4) % 4;
        if (points > 0) {
          rendererRef.current?.showFloatingPoints(rotatedWinner, points);
        }
        const winnerName = winner === mySeatRef.current ? 'You' : (seatNamesRef.current[winner] || `Player ${winner + 1}`);
        setMessage(`${winnerName} took the trick${points > 0 ? ` (+${points} pts)` : ''}`);
        // Message will be cleared when next game-state arrives
      }
    } else if (data.type === 'pass-submitted') {
      // Host tells us who has submitted pass cards so far
      if (!isHost) {
        const submitted: boolean[] = data.submitted;
        const waiting = submitted
          .map((done, i) => !done ? (seatNamesRef.current[i] || `Player ${i + 1}`) : null)
          .filter((n): n is string => n !== null);
        if (waiting.length > 0) {
          setMessage(`Waiting for ${waiting.join(', ')} to pass...`);
        }
      }
    } else if (data.type === 'pass-execute') {
      // Host says cards were passed
      if (!isHost) {
        setMessage('Cards passed!');
        setTimeout(() => setMessage(''), 1500);
      }
    } else if (data.type === 'game-state') {
      // Host broadcasts full state
      if (!isHost && game) {
        if (mySeatRef.current < 0) return; // Not yet seated
        const s: HeartsState = data.state;

        // If we're animating (deal), queue this state for later
        if (animatingRef.current) {
          pendingStateRef.current = s;
          return;
        }

        applyRemoteState(s);
      }
    } else if (data.type === 'pass-cards') {
      // A player submits their pass cards (host processes)
      if (isHost && game) {
        const cards: Card[] = data.cards;
        const seat: number = data.seat;
        for (const card of cards) {
          game.selectPassCard(seat, card);
        }
        // Broadcast who has submitted so far
        const s = game.getState();
        const submitted = s.passingCards.map((p) => p.length >= 3);
        broadcastEvent({ type: 'pass-submitted', submitted });

        // Check if all passes are in
        if (s.passingCards.every((p) => p.length === 3)) {
          game.executePass();
          broadcastEvent({ type: 'pass-execute' });
          broadcastState(game);
          const newS = game.getState();
          // Show 2 of clubs message for host
          if (newS.phase === 'playing') {
            const isFirstTrick = newS.tricks.every((t) => t.length === 0);
            if (isFirstTrick) {
              if (newS.currentPlayer === mySeatRef.current) {
                setMessage('Your turn \u2014 lead with the 2 of Clubs!');
              } else {
                const name = getSeatDisplayName(newS.currentPlayer);
                setMessage(`${name} leads with the 2 of Clubs`);
              }
            }
          }
          if (newS.currentPlayer !== mySeatRef.current && aiSeatsRef.current.has(newS.currentPlayer)) {
            hostAiPlayRef.current?.(game, aiSeatsRef.current);
          }
        } else {
          // Not all submitted yet — update host's own message
          const waitingFor = s.passingCards
            .map((p, i) => p.length < 3 ? getSeatDisplayName(i) : null)
            .filter((n): n is string => n !== null && n !== 'You');
          if (waitingFor.length > 0) {
            setMessage(`Waiting for ${waitingFor.join(', ')} to pass...`);
          }
        }
      }
    } else if (data.type === 'play-card') {
      // A player plays a card (host processes)
      if (isHost && game) {
        const card: Card = data.card;
        const seat: number = data.seat;

        if (game.playCard(seat, card)) {
          SoundManager.getInstance().play('card-flip');
          broadcastEvent({ type: 'card-played', seat, card });
          const s = game.getState();

          const completedTrick = game.getLastCompletedTrick();
          if (completedTrick) {
            // Show trick with cards visible
            const displayS = { ...s, currentTrick: completedTrick.cards as (Card | null)[] };
            setState({ ...displayS });
            const rotated = rotateStateForSeat(displayS, mySeatRef.current);
            rendererRef.current?.render(rotated, new Set());
            adapterRef.current?.sendMove({ type: 'game-state', state: displayS });

            const winner = completedTrick.winner;
            const trickPts = completedTrick.points;
            const rotatedWinner = (winner - mySeatRef.current + 4) % 4;
            if (trickPts > 0) {
              rendererRef.current?.showFloatingPoints(rotatedWinner, trickPts);
            }
            const winnerName = getSeatDisplayName(winner);
            setMessage(`${winnerName} took the trick${trickPts > 0 ? ` (+${trickPts} pts)` : ''}`);
            broadcastEvent({ type: 'trick-won', winner, points: trickPts });

            setTimeout(() => {
              game.clearLastCompletedTrick();
              broadcastState(game);
              setMessage('');
              const latestS = game.getState();
              if (latestS.phase === 'playing' && aiSeatsRef.current.has(latestS.currentPlayer)) {
                hostAiPlayRef.current?.(game, aiSeatsRef.current);
              } else if (latestS.phase === 'round-over') {
                setMessage('Round over!');
              } else if (latestS.phase === 'game-over') {
                setGameOver(true);
              } else if (latestS.phase === 'playing') {
                if (latestS.currentPlayer === mySeatRef.current) {
                  setMessage('Your turn \u2014 play a card');
                } else {
                  const name = getSeatDisplayName(latestS.currentPlayer);
                  setMessage(`Waiting for ${name}...`);
                }
              }
            }, 1500);
          } else {
            broadcastState(game);
            if (s.phase === 'playing' && aiSeatsRef.current.has(s.currentPlayer)) {
              hostAiPlayRef.current?.(game, aiSeatsRef.current);
            } else if (s.phase === 'round-over') {
              setMessage('Round over!');
            } else if (s.phase === 'game-over') {
              setGameOver(true);
            } else if (s.phase === 'playing') {
              if (s.currentPlayer === mySeatRef.current) {
                setMessage('Your turn \u2014 play a card');
              } else {
                const name = getSeatDisplayName(s.currentPlayer);
                setMessage(`Waiting for ${name}...`);
              }
            }
          }
        }
      }
    } else if (data.type === 'next-round-req') {
      // Non-host requests next round; host processes
      if (isHost && game && game.getState().phase === 'round-over') {
        game.startNextRound();
        setSelectedCards(new Set());
        setMessage('');

        const s = game.getState();
        if (s.phase === 'passing') {
          for (const aiSeat of aiSeatsRef.current) {
            const pc = selectPassCards(s.hands[aiSeat]);
            for (const c of pc) game.selectPassCard(aiSeat, c);
          }
        }

        const handSizes = s.hands.map((hand) => hand.length);
        broadcastEvent({ type: 'deal-start', handSizes });
        rendererRef.current?.playDealAnimation(handSizes, () => {
          SoundManager.getInstance().play('card-deal');
          broadcastState(game);
          if (game.getState().phase === 'passing') {
            setMessage('Select 3 cards to pass');
          } else if (game.getState().phase === 'playing') {
            const gs = game.getState();
            if (gs.currentPlayer === mySeatRef.current) {
              setMessage('Your turn \u2014 lead with the 2 of Clubs!');
            } else {
              const name = getSeatDisplayName(gs.currentPlayer);
              setMessage(`${name} leads with the 2 of Clubs`);
            }
          }
        });
      }
    }
  };

  // ── Multiplayer: setup adapter ─────────────────────────────
  useEffect(() => {
    if (!isMultiplayer) return;

    const adapter = new MultiplayerGameAdapter('hearts');
    adapterRef.current = adapter;

    adapter.connect((data: any) => {
      handleRemoteMessageRef.current?.(data);
    });

    // Announce ourselves
    const authProfile = useAuthStore.getState().profile;
    const authUser = useAuthStore.getState().user;
    const myUserId = authUser?.id || `guest-${Date.now()}`;
    const myDisplayName = authProfile?.display_name || 'Player';
    myUserIdRef.current = myUserId;

    if (!isHost) {
      // Send player-info with retry until seat is assigned
      const sendInfo = () => {
        adapter.sendMove({
          type: 'player-info',
          userId: myUserId,
          name: myDisplayName,
        });
      };
      const infoTimeout = setTimeout(sendInfo, 500);
      const retryId = setInterval(() => {
        if (mySeatRef.current !== -1) { clearInterval(retryId); return; }
        sendInfo();
      }, 2000);
      // Stop retrying after 15 seconds
      const stopRetry = setTimeout(() => clearInterval(retryId), 15000);

      return () => {
        clearTimeout(infoTimeout);
        clearInterval(retryId);
        clearTimeout(stopRetry);
        adapter.disconnect();
        adapterRef.current = null;
      };
    }

    return () => {
      adapter.disconnect();
      adapterRef.current = null;
    };
  }, [isMultiplayer, isHost]);

  // ── Canvas & game init ─────────────────────────────────────
  useEffect(() => {
    if (!gameStarted || !canvasRef.current) return;
    let destroyed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        width: 900,
        height: 650,
        backgroundColor: 0x155c2a,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (destroyed) { app.destroy(); return; }

      canvasRef.current!.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const game = new HeartsGame();
      gameRef.current = game;

      // Set up opponents display
      let opps: HeartsOpponent[];
      if (isMultiplayer) {
        // Use seat names for opponent display
        opps = [1, 2, 3].map((i) => {
          const displayIdx = (mySeatRef.current + i) % 4;
          const name = seatNames[displayIdx] || SEAT_LABELS[i];
          return {
            name,
            color: SEAT_COLORS[displayIdx],
            initial: name.charAt(0).toUpperCase(),
          };
        });
      } else {
        opps = pickOpponents(3);
      }
      opponentsRef.current = opps;

      const renderer = new HeartsRenderer(app);
      renderer.setOpponents(opps);
      rendererRef.current = renderer;

      if (isMultiplayer && isHost) {
        // Host initializes and deals
        game.initialize();

        // Handle AI for empty seats
        const aiSeats = new Set<number>();
        for (let i = 0; i < 4; i++) {
          if (lobbyPlayerIds[i] === null || lobbyPlayerIds[i] === 'ai') {
            aiSeats.add(i);
          }
        }
        aiSeatsRef.current = aiSeats;

        // AI pass cards for AI seats
        const s = game.getState();
        if (s.phase === 'passing') {
          for (const aiSeat of aiSeats) {
            const passCards = selectPassCards(s.hands[aiSeat]);
            for (const card of passCards) game.selectPassCard(aiSeat, card);
          }
        }

        const newS = game.getState();
        setState({ ...newS });
        const handSizes = newS.hands.map((hand) => hand.length);
        // Tell non-host to play deal animation
        broadcastEvent({ type: 'deal-start', handSizes });
        renderer.playDealAnimation(handSizes, () => {
          SoundManager.getInstance().play('card-deal');
          broadcastState(game);
          if (game.getState().phase === 'passing') {
            setMessage('Select 3 cards to pass');
          } else if (game.getState().phase === 'playing') {
            // No-pass round (round 4, 8, etc) — show 2 of clubs message
            const gs = game.getState();
            if (gs.currentPlayer === mySeatRef.current) {
              setMessage('Your turn \u2014 lead with the 2 of Clubs!');
            } else {
              const name = getSeatDisplayName(gs.currentPlayer);
              setMessage(`${name} leads with the 2 of Clubs`);
            }
          }
        });
      } else if (isMultiplayer && !isHost) {
        // Non-host: wait for state from host
        game.initialize(); // dummy init, will be overwritten by state sync
        setState(game.getState());
      } else {
        // Single-player
        game.initialize();
        aiPassCards(game);
        const s = game.getState();
        setState({ ...s });
        const handSizes = s.hands.map((hand) => hand.length);
        renderer.playDealAnimation(handSizes, () => {
          SoundManager.getInstance().play('card-deal');
          const current = game.getState();
          setState({ ...current });
          renderer.render(current);
          if (current.phase === 'passing') setMessage('Select 3 cards to pass, then click "Pass Cards"');
        });
      }

      // Card click handler
      renderer.setOnCardClick((card: Card) => {
        const g = gameRef.current;
        if (!g) return;
        const seat = mySeatRef.current;
        if (isMultiplayer && seat < 0) return; // Not yet seated

        // Non-host multiplayer uses host-synced React state; host/single-player uses local game state
        const s = (isMultiplayer && !isHost) ? stateRef.current : g.getState();
        if (!s) return;

        if (isMultiplayer) {
          // Multiplayer card clicks
          if (s.phase === 'passing') {
            const currentSelected = selectedCardsRef.current;
            const newSelected = new Set(currentSelected);
            if (newSelected.has(card.id)) {
              newSelected.delete(card.id);
            } else if (newSelected.size < 3) {
              newSelected.add(card.id);
            }
            SoundManager.getInstance().play('card-select');
            selectedCardsRef.current = newSelected;
            setSelectedCards(newSelected);
            // Re-render with selection — use host-synced state for non-host
            const baseState = (isMultiplayer && !isHost && stateRef.current) ? stateRef.current : g.getState();
            const rotated = rotateStateForSeat(baseState, seat);
            renderer.render(rotated, newSelected);
          } else if (s.phase === 'playing' && s.currentPlayer === seat) {
            // Our turn to play
            if (isHost) {
              // Host processes locally
              if (g.playCard(seat, card)) {
                SoundManager.getInstance().play('card-place');
                setSelectedCards(new Set());
                broadcastEvent({ type: 'card-played', seat, card });
                const newS = g.getState();

                const completedTrick = g.getLastCompletedTrick();
                if (completedTrick) {
                  // Show trick with cards visible
                  const displayS = { ...newS, currentTrick: completedTrick.cards as (Card | null)[] };
                  setState({ ...displayS });
                  const rotated = rotateStateForSeat(displayS, mySeatRef.current);
                  rendererRef.current?.render(rotated, new Set());
                  adapterRef.current?.sendMove({ type: 'game-state', state: displayS });

                  const winner = completedTrick.winner;
                  const trickPts = completedTrick.points;
                  const rotatedWinner = (winner - mySeatRef.current + 4) % 4;
                  if (trickPts > 0) {
                    rendererRef.current?.showFloatingPoints(rotatedWinner, trickPts);
                  }
                  const winnerName = getSeatDisplayName(winner);
                  setMessage(`${winnerName} took the trick${trickPts > 0 ? ` (+${trickPts} pts)` : ''}`);
                  broadcastEvent({ type: 'trick-won', winner, points: trickPts });

                  setTimeout(() => {
                    g.clearLastCompletedTrick();
                    broadcastState(g);
                    setMessage('');
                    const latestS = g.getState();
                    if (latestS.phase === 'playing' && aiSeatsRef.current.has(latestS.currentPlayer)) {
                      hostAiPlayRef.current?.(g, aiSeatsRef.current);
                    } else if (latestS.phase === 'round-over') {
                      setMessage('Round over!');
                    } else if (latestS.phase === 'game-over') {
                      setGameOver(true);
                      const w = g.getWinner();
                      SoundManager.getInstance().play(w === seat ? 'game-win' : 'game-lose');
                      recordGameRef.current('hearts', w === seat, 'Opponent');
                    } else if (latestS.phase === 'playing') {
                      if (latestS.currentPlayer === mySeatRef.current) {
                        setMessage('Your turn \u2014 play a card');
                      } else {
                        const name = getSeatDisplayName(latestS.currentPlayer);
                        setMessage(`Waiting for ${name}...`);
                      }
                    }
                  }, 1500);
                } else {
                  broadcastState(g);
                  if (newS.phase === 'playing' && aiSeatsRef.current.has(newS.currentPlayer)) {
                    hostAiPlayRef.current?.(g, aiSeatsRef.current);
                  } else if (newS.phase === 'round-over') {
                    setMessage('Round over!');
                  } else if (newS.phase === 'game-over') {
                    setGameOver(true);
                    const winner = g.getWinner();
                    SoundManager.getInstance().play(winner === seat ? 'game-win' : 'game-lose');
                    recordGameRef.current('hearts', winner === seat, 'Opponent');
                  } else if (newS.phase === 'playing') {
                    if (newS.currentPlayer === mySeatRef.current) {
                      setMessage('Your turn \u2014 play a card');
                    } else {
                      const name = getSeatDisplayName(newS.currentPlayer);
                      setMessage(`Waiting for ${name}...`);
                    }
                  }
                }
              }
            } else {
              // Non-host: send to host for validation
              adapterRef.current?.sendMove({ type: 'play-card', seat, card });
              SoundManager.getInstance().play('card-place');
            }
          }
        } else {
          // Single-player card clicks (existing logic)
          if (s.phase === 'passing') {
            const currentSelected = selectedCardsRef.current;
            const newSelected = new Set(currentSelected);
            if (newSelected.has(card.id)) {
              newSelected.delete(card.id);
              g.deselectPassCard(0, card);
            } else if (newSelected.size < 3) {
              newSelected.add(card.id);
              g.selectPassCard(0, card);
            }
            SoundManager.getInstance().play('card-select');
            selectedCardsRef.current = newSelected;
            setSelectedCards(newSelected);
            renderer.render(g.getState(), newSelected);
            setState({ ...g.getState() });
          } else if (s.phase === 'playing' && s.currentPlayer === 0) {
            const heartsBefore = s.heartsBroken;
            if (g.playCard(0, card)) {
              SoundManager.getInstance().play('card-place');
              setSelectedCards(new Set());
              const newState = g.getState();
              if (!heartsBefore && newState.heartsBroken) showBubble(commentOnHeartsBroken());

              const completedTrick = g.getLastCompletedTrick();
              if (completedTrick) {
                // Show trick with all 4 cards visible
                const displayS = { ...newState, currentTrick: completedTrick.cards as (Card | null)[] };
                setState({ ...displayS });
                renderer.render(displayS, new Set());
                const winner = completedTrick.winner;
                const pts = completedTrick.points;
                const winnerName = winner === 0 ? 'You' : (opponentsRef.current[winner - 1]?.name || 'Opponent');
                setMessage(`${winnerName} took the trick${pts > 0 ? ` (+${pts} pts)` : ''}`);
                if (pts > 0) renderer.showFloatingPoints(winner, pts);
                showBubble(commentOnTrickWon(winner, pts));

                setTimeout(() => {
                  g.clearLastCompletedTrick();
                  setState({ ...newState });
                  renderer.render(newState, new Set());
                  setMessage('');
                  if (newState.phase === 'playing' && newState.currentPlayer !== 0) {
                    aiPlayTurn(g);
                  } else if (newState.phase === 'round-over') {
                    setMessage('Round over!');
                    showBubble(commentOnRoundOver(newState.scores));
                  } else if (newState.phase === 'game-over') {
                    const w = g.getWinner();
                    setGameOver(true);
                    SoundManager.getInstance().play(w === 0 ? 'game-win' : 'game-lose');
                    recordGameRef.current('hearts', w === 0, 'AI');
                    showBubble(commentOnGameOver(newState.totalScores));
                  }
                }, 1200);
              } else {
                setState({ ...newState });
                renderer.render(newState, new Set());
                if (newState.phase === 'playing' && newState.currentPlayer !== 0) {
                  aiPlayTurn(g);
                } else if (newState.phase === 'round-over') {
                  setMessage('Round over!');
                  showBubble(commentOnRoundOver(newState.scores));
                } else if (newState.phase === 'game-over') {
                  const winner = g.getWinner();
                  setGameOver(true);
                  SoundManager.getInstance().play(winner === 0 ? 'game-win' : 'game-lose');
                  recordGameRef.current('hearts', winner === 0, 'AI');
                  showBubble(commentOnGameOver(newState.totalScores));
                }
              }
            }
          }
        }
      });
    };

    init();
    return () => {
      destroyed = true;
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current);
      rendererRef.current?.destroy();
      if (appRef.current) { appRef.current.destroy(true); appRef.current = null; }
    };
  }, [gameStarted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ────────────────────────────────────────────────
  const handlePass = () => {
    const game = gameRef.current;
    if (!game || selectedCards.size !== 3) return;
    SoundManager.getInstance().play('card-deal');

    if (isMultiplayer) {
      if (isHost) {
        // Check if pass was already executed (by remote trigger)
        const s = game.getState();
        if (s.phase !== 'passing') {
          selectedCardsRef.current = new Set();
          setSelectedCards(new Set());
          setMessage('');
          return;
        }
        // Register host's pass cards NOW (not during card clicks, to prevent
        // premature execution when non-host submits first)
        const mySeatNow = mySeatRef.current;
        const myHand = s.hands[mySeatNow];
        const hostPassCards = myHand.filter((c) => selectedCards.has(c.id));
        for (const c of hostPassCards) {
          game.selectPassCard(mySeatNow, c);
        }
        // Broadcast who has submitted so far
        const updated = game.getState();
        const submitted = updated.passingCards.map((p) => p.length >= 3);
        broadcastEvent({ type: 'pass-submitted', submitted });

        // Check if all passes are in
        if (updated.passingCards.every((p) => p.length === 3)) {
          game.executePass();
          selectedCardsRef.current = new Set();
          setSelectedCards(new Set());
          broadcastEvent({ type: 'pass-execute' });
          broadcastState(game);
          const newS = game.getState();
          // Show 2 of clubs message
          if (newS.phase === 'playing') {
            const isFirstTrick = newS.tricks.every((t) => t.length === 0);
            if (isFirstTrick) {
              if (newS.currentPlayer === mySeatRef.current) {
                setMessage('Your turn \u2014 lead with the 2 of Clubs!');
              } else {
                const name = getSeatDisplayName(newS.currentPlayer);
                setMessage(`${name} leads with the 2 of Clubs`);
              }
            } else {
              setMessage('');
            }
          } else {
            setMessage('');
          }
          if (newS.currentPlayer !== mySeat && aiSeatsRef.current.has(newS.currentPlayer)) {
            hostAiPlayRef.current?.(game, aiSeatsRef.current);
          }
        } else {
          // Not all submitted — show who we're waiting for
          const waitingFor = updated.passingCards
            .map((p, i) => p.length < 3 ? getSeatDisplayName(i) : null)
            .filter((n): n is string => n !== null && n !== 'You');
          if (waitingFor.length > 0) {
            setMessage(`Waiting for ${waitingFor.join(', ')} to pass...`);
          } else {
            setMessage('Waiting for other players to pass...');
          }
        }
      } else {
        // Non-host: send pass cards to host (use host-synced React state, not local game)
        if (mySeat < 0) return; // Shouldn't happen, but guard
        const hostState = state ?? game.getState();
        const myHand = hostState.hands[mySeat];
        const passCards = myHand.filter((c) => selectedCards.has(c.id));
        adapterRef.current?.sendMove({ type: 'pass-cards', seat: mySeat, cards: passCards });
        selectedCardsRef.current = new Set();
        setSelectedCards(new Set());
        setMessage('Waiting for other players to pass...');
      }
    } else {
      // Single-player
      game.executePass();
      selectedCardsRef.current = new Set();
      setSelectedCards(new Set());
      setMessage('');
      const s = game.getState();
      setState({ ...s });
      rendererRef.current?.render(s, new Set());
      showBubble(commentOnPass());
      if (s.currentPlayer !== 0) aiPlayTurn(game);
    }
  };

  const handleNextRound = () => {
    const game = gameRef.current;
    if (!game) return;

    if (isMultiplayer && isHost) {
      game.startNextRound();
      setSelectedCards(new Set());
      setMessage('');
      rendererRef.current?.clearBubble();

      // AI pass for AI seats
      const s = game.getState();
      if (s.phase === 'passing') {
        for (const aiSeat of aiSeatsRef.current) {
          const passCards = selectPassCards(s.hands[aiSeat]);
          for (const card of passCards) game.selectPassCard(aiSeat, card);
        }
      }

      const handSizes = s.hands.map((hand) => hand.length);
      broadcastEvent({ type: 'deal-start', handSizes });
      rendererRef.current?.playDealAnimation(handSizes, () => {
        SoundManager.getInstance().play('card-deal');
        broadcastState(game);
        if (game.getState().phase === 'passing') {
          setMessage('Select 3 cards to pass');
        } else if (game.getState().phase === 'playing') {
          const gs = game.getState();
          if (gs.currentPlayer === mySeatRef.current) {
            setMessage('Your turn \u2014 lead with the 2 of Clubs!');
          } else {
            const name = getSeatDisplayName(gs.currentPlayer);
            setMessage(`${name} leads with the 2 of Clubs`);
          }
        }
      });
      adapterRef.current?.sendMove({ type: 'next-round' });
    } else if (isMultiplayer && !isHost) {
      // Non-host requests next round (host will handle it)
      adapterRef.current?.sendMove({ type: 'next-round-req' });
    } else {
      // Single-player
      game.startNextRound();
      setSelectedCards(new Set());
      setMessage('');
      rendererRef.current?.clearBubble();
      aiPassCards(game);
      const s = game.getState();
      setState({ ...s });
      const handSizes = s.hands.map((hand) => hand.length);
      rendererRef.current?.playDealAnimation(handSizes, () => {
        SoundManager.getInstance().play('card-deal');
        const current = game.getState();
        setState({ ...current });
        rendererRef.current?.render(current);
        if (current.phase === 'passing') setMessage('Select 3 cards to pass');
        else if (current.currentPlayer !== 0) aiPlayTurn(game);
      });
    }
  };

  const handleResign = () => {
    if (!isMultiplayer || gameOver) return;
    adapterRef.current?.sendMove({ type: 'resign' });
    setPlayerWon(false);
    setGameOver(true);
    SoundManager.getInstance().play('game-lose');
    recordGameRef.current('hearts', false, 'Opponent');
  };

  const handleNewGame = () => {
    const game = gameRef.current;
    if (!game) return;
    setGameOver(false);
    rendererRef.current?.clearBubble();

    if (!isMultiplayer) {
      const opps = pickOpponents(3);
      opponentsRef.current = opps;
      rendererRef.current?.setOpponents(opps);
    }

    game.initialize();
    setSelectedCards(new Set());
    setMessage('Select 3 cards to pass');

    if (isMultiplayer && isHost) {
      // AI pass for AI seats
      const s = game.getState();
      if (s.phase === 'passing') {
        for (const aiSeat of aiSeatsRef.current) {
          const passCards = selectPassCards(s.hands[aiSeat]);
          for (const card of passCards) game.selectPassCard(aiSeat, card);
        }
      }
      const hs = game.getState();
      setState({ ...hs });
      const handSizes2 = hs.hands.map((hand) => hand.length);
      broadcastEvent({ type: 'deal-start', handSizes: handSizes2 });
      rendererRef.current?.playDealAnimation(handSizes2, () => {
        SoundManager.getInstance().play('card-deal');
        broadcastState(game);
      });
    } else if (!isMultiplayer) {
      aiPassCards(game);
      const s = game.getState();
      setState({ ...s });
      const handSizes = s.hands.map((hand) => hand.length);
      rendererRef.current?.playDealAnimation(handSizes, () => {
        SoundManager.getInstance().play('card-deal');
        const current = game.getState();
        setState({ ...current });
        rendererRef.current?.render(current);
      });
    }
  };

  const handleStartGame = () => {
    // Host starts the multiplayer game
    const finalNames = [...seatNames];
    const aiSeats: number[] = [];
    const finalPlayers = [...lobbyPlayerIds];

    // Pick real names for AI seats
    const emptyCount = finalPlayers.filter(p => p === null).length;
    const aiOpps = emptyCount > 0 ? pickOpponents(emptyCount) : [];
    let aiNameIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (finalPlayers[i] === null) {
        finalPlayers[i] = 'ai';
        finalNames[i] = aiOpps[aiNameIdx++].name;
        aiSeats.push(i);
      }
    }
    // Broadcast with real names (not "You") so remote players see the host's name
    adapterRef.current?.sendMove({
      type: 'start-game',
      seatNames: finalNames,
      aiSeats,
    });

    // Local display: show "You" for the host's own seat
    if (mySeat === 0) finalNames[0] = 'You';

    setSeatNames(finalNames);
    setLobbyPlayerIds(finalPlayers);
    aiSeatsRef.current = new Set(aiSeats);

    // Mark room as playing
    if (roomId) multiplayerService.updateRoomStatus(roomId, 'playing');

    setGameStarted(true);
  };

  // ── Render: state for display ──────────────────────────────
  const displayState = state
    ? (isMultiplayer ? rotateStateForSeat(state, mySeat) : state)
    : null;

  // For opponent display indices (visual positions 1=West, 2=North, 3=East)
  const getOpponentData = (visualPos: number) => {
    if (!displayState) return { score: 0, roundScore: 0, cards: 0 };
    return {
      score: displayState.totalScores[visualPos],
      roundScore: displayState.scores[visualPos],
      cards: displayState.hands[visualPos].length,
    };
  };

  // ── Lobby view ─────────────────────────────────────────────
  if (isMultiplayer && !gameStarted) {
    const playerCount = lobbyPlayerIds.filter((p) => p !== null).length;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center py-8 px-4">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h2 className="text-2xl font-display font-bold text-white mb-2">Hearts Lobby</h2>
          <p className="text-white/50 text-sm">Waiting for players to join...</p>
          {inviteCode && (
            <div className="mt-3">
              <div className="text-xs text-white/40 mb-1">Room Code</div>
              <div className="text-3xl font-mono font-bold text-amber-400 tracking-[0.3em]">{inviteCode}</div>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-2 gap-4 mb-8 max-w-md w-full">
          {[0, 1, 2, 3].map((i) => {
            const filled = lobbyPlayerIds[i] !== null;
            const isMe = i === mySeat;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-xl p-4 text-center border-2 ${
                  filled
                    ? 'bg-white/10 border-amber-500/50'
                    : 'bg-white/5 border-white/10 border-dashed'
                }`}
              >
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: filled ? hexToCSS(SEAT_COLORS[i]) : 'rgba(255,255,255,0.1)' }}
                >
                  {filled ? seatNames[i].charAt(0) : '?'}
                </div>
                <div className="text-sm text-white font-medium">
                  {filled ? seatNames[i] : 'Empty'}
                </div>
                <div className="text-xs text-white/40 mt-0.5">
                  {isMe ? '(You)' : SEAT_LABELS[i]}
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="text-sm text-white/50 mb-4">
          {playerCount}/4 players
        </div>

        <div className="flex gap-3">
          {isHost && playerCount >= 2 && (
            <button onClick={handleStartGame} className="btn-primary text-sm py-2 px-6">
              {playerCount < 4 ? `Start with ${4 - playerCount} AI` : 'Start Game'}
            </button>
          )}
          <button
            onClick={async () => {
              await multiplayerService.leaveRoom();
              navigate('/lobby/hearts');
            }}
            className="btn-secondary text-sm py-2 px-4"
          >
            Leave
          </button>
        </div>
      </div>
    );
  }

  // ── Game view ──────────────────────────────────────────────
  const phaseText = isMultiplayer
    ? (displayState?.phase === 'passing'
        ? 'Pass Phase'
        : displayState?.phase === 'playing'
          ? (displayState.currentPlayer === 0 ? 'Your Turn' : 'Waiting...')
          : '')
    : (displayState?.phase === 'passing'
        ? 'Pass Phase'
        : displayState?.phase === 'playing'
          ? (displayState.currentPlayer === 0 ? 'Your Turn' : 'AI Playing...')
          : '');

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[900px] flex items-center justify-between mb-3"
      >
        <button onClick={() => {
          if (isMultiplayer && !gameOver) {
            if (!window.confirm('Leaving will count as a resignation. Are you sure?')) return;
            adapterRef.current?.sendMove({ type: 'resign' });
          }
          navigate('/lobby/hearts');
        }} className="text-sm text-white/50 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg">
          {'\u2190'} Back
        </button>
        <h2 className="text-lg font-display font-bold text-white">Hearts</h2>
        <span className="text-sm text-white/60">{phaseText}</span>
      </motion.div>

      {message && (
        <div className="w-full max-w-[1100px] text-center text-sm text-amber-400 mb-2">{message}</div>
      )}

      {/* Game area with HTML opponent cards around the canvas */}
      <div className="flex items-center gap-2 w-full" style={{ maxWidth: 1100 }}>
        {/* West opponent */}
        <div className="hidden md:flex flex-col items-center gap-1 w-24 shrink-0">
          {opponentsRef.current[0] && (
            <PlayerCard
              opp={opponentsRef.current[0]}
              score={getOpponentData(1).score}
              roundScore={getOpponentData(1).roundScore}
              cards={getOpponentData(1).cards}
            />
          )}
        </div>

        <div className="flex flex-col items-center flex-1 min-w-0">
          {/* North opponent */}
          <div className="mb-1">
            {opponentsRef.current[1] && (
              <PlayerCard
                opp={opponentsRef.current[1]}
                score={getOpponentData(2).score}
                roundScore={getOpponentData(2).roundScore}
                cards={getOpponentData(2).cards}
                horizontal
              />
            )}
          </div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="game-canvas-container" style={{ maxWidth: 900, aspectRatio: '900 / 650' }}>
            <div ref={canvasRef} />
          </motion.div>

          {/* You (bottom) */}
          <div className="mt-1 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-sm font-bold text-amber-300">{'\u265A'}</div>
            <div className="text-xs text-white/60">You</div>
            <div className="text-sm font-bold text-white">{displayState?.totalScores[0] ?? 0}</div>
            {(displayState?.scores[0] ?? 0) > 0 && (
              <span className="text-xs text-red-400">+{displayState?.scores[0]}</span>
            )}
          </div>
        </div>

        {/* East opponent */}
        <div className="hidden md:flex flex-col items-center gap-1 w-24 shrink-0">
          {opponentsRef.current[2] && (
            <PlayerCard
              opp={opponentsRef.current[2]}
              score={getOpponentData(3).score}
              roundScore={getOpponentData(3).roundScore}
              cards={getOpponentData(3).cards}
            />
          )}
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[900px] flex items-center justify-center gap-3 mt-3">
        {displayState?.phase === 'passing' && (
          <button onClick={handlePass} className="btn-primary text-sm py-2 px-4" disabled={selectedCards.size !== 3}>
            Pass Cards ({selectedCards.size}/3)
          </button>
        )}
        {displayState?.phase === 'round-over' && (
          <button onClick={handleNextRound} className="btn-primary text-sm py-2 px-4">Next Round</button>
        )}
        {isMultiplayer && !gameOver && (
          <button onClick={handleResign} className="text-sm py-2 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors">
            Resign
          </button>
        )}
        {!isMultiplayer && (
          <button onClick={handleNewGame} className="btn-secondary text-sm py-2 px-4">New Game</button>
        )}
      </motion.div>

      <GameOverModal
        isOpen={gameOver}
        won={playerWon ?? (displayState ? displayState.totalScores[0] === Math.min(...displayState.totalScores) : false)}
        title={playerWon === true
          ? 'Opponent Resigned - You Win!'
          : playerWon === false
            ? 'You Resigned'
            : displayState
              ? (displayState.totalScores[0] === Math.min(...displayState.totalScores) ? 'You Win!' : 'Game Over')
              : ''}
        gameId="hearts"
        stats={displayState ? [
          { label: 'Your Score', value: displayState.totalScores[0].toString() },
          { label: 'Rounds', value: displayState.roundNumber.toString() },
        ] : []}
        onPlayAgain={isMultiplayer ? undefined : handleNewGame}
      />
    </div>
  );
}
