import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Application } from 'pixi.js';
import { motion } from 'framer-motion';
import { Card } from '../../engine/types';
import { RummyGame } from './RummyGame';
import { RummyRenderer } from './RummyRenderer';
import { RummyState } from './rules';
import { aiDecideDraw, aiSelectDiscard, aiShouldKnock, aiSelectKnockDiscard } from './RummyAI';
import { useUserStore } from '../../stores/userStore';
import { useGameStore } from '../../stores/gameStore';
import { useAuthStore } from '../../stores/authStore';
import { MultiplayerGameAdapter } from '../../lib/multiplayerGameAdapter';
import { SoundManager } from '../../engine/SoundManager';
import GameOverModal from '../../ui/GameOverModal';

export default function RummyPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const gameRef = useRef<RummyGame | null>(null);
  const rendererRef = useRef<RummyRenderer | null>(null);
  const adapterRef = useRef<MultiplayerGameAdapter | null>(null);
  const navigate = useNavigate();

  const [state, setState] = useState<RummyState | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [playerWon, setPlayerWon] = useState<boolean | null>(null);
  const [roundOver, setRoundOver] = useState(false);
  const [message, setMessage] = useState('');
  const recordGame = useUserStore((s) => s.recordGame);
  const isMultiplayer = useGameStore((s) => s.isMultiplayer);
  const playerColor = useGameStore((s) => s.playerColor);
  const multiplayerOpponentName = useGameStore((s) => s.multiplayerOpponentName);
  const setMultiplayerOpponentName = useGameStore((s) => s.setMultiplayerOpponentName);
  const selectedOpponent = useGameStore((s) => s.selectedOpponent);

  // In multiplayer: host is player 0 (w), joiner is player 1 (b)
  const isHost = !isMultiplayer || playerColor === 'w';
  const localPlayer = isHost ? 0 : 1;

  const recordGameRef = useRef(recordGame);
  recordGameRef.current = recordGame;
  const stateRef = useRef<RummyState | null>(null);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Animation queuing for non-host (same pattern as Hearts)
  const animatingRef = useRef(false);
  const pendingStateRef = useRef<RummyState | null>(null);

  const aiTurnRef = useRef<(game: RummyGame, renderer: RummyRenderer) => Promise<void>>();

  const aiTurn = useCallback(async (game: RummyGame, renderer: RummyRenderer) => {
    await new Promise((r) => setTimeout(r, 500));

    const s = game.getState();
    if (s.currentPlayer !== 1 || s.phase === 'finished' || s.phase === 'round-over') return;

    // AI draws
    const drawChoice = aiDecideDraw(s);
    if (drawChoice === 'discard') {
      game.drawFromDiscard();
    } else {
      if (!game.drawFromPile()) {
        const newState = game.getState();
        setState({ ...newState });
        renderer.render(newState);
        setMessage(newState.lastAction);
        if (newState.phase === 'round-over') setRoundOver(true);
        return;
      }
    }

    SoundManager.getInstance().play('card-deal');
    const afterDraw = game.getState();
    setState({ ...afterDraw });
    renderer.render(afterDraw);

    await new Promise((r) => setTimeout(r, 300));

    const aiHand = game.getState().hands[1];
    if (aiShouldKnock(aiHand)) {
      const knockDiscard = aiSelectKnockDiscard(aiHand);
      if (knockDiscard && game.knockWithDiscard(knockDiscard)) {
        SoundManager.getInstance().play('card-place');
        const newState = game.getState();
        setState({ ...newState });
        renderer.render(newState);
        setMessage(newState.lastAction);
        if (newState.phase === 'finished') {
          setGameOver(true);
          recordGameRef.current('rummy', newState.winner === 0, useGameStore.getState().selectedOpponent?.name ?? 'AI');
        } else if (newState.phase === 'round-over') {
          setRoundOver(true);
        }
        return;
      }
    }

    const discard = aiSelectDiscard(game.getState().hands[1]);
    game.discard(discard);
    SoundManager.getInstance().play('card-flip');

    const newState = game.getState();
    setState({ ...newState });
    renderer.render(newState);
    setMessage(newState.lastAction);

    if (newState.phase === 'finished') {
      setGameOver(true);
      recordGameRef.current('rummy', newState.winner === 0, useGameStore.getState().selectedOpponent?.name ?? 'AI');
    } else if (newState.phase === 'round-over') {
      setRoundOver(true);
    }
  }, []);

  aiTurnRef.current = aiTurn;

  // ── Helper: broadcast state to remote player (host only) ──
  // NOTE: caller is responsible for rendering; this only sends state to remote
  const broadcastState = useCallback((game: RummyGame) => {
    if (!isMultiplayer || !isHost) return;
    const adapter = adapterRef.current;
    if (!adapter) return;
    const s = game.getState();
    setState({ ...s });
    adapter.sendMove({ type: 'game-state', state: s });
  }, [isMultiplayer, isHost]);

  /** Host sends an event message to trigger animations/feedback on non-host */
  const broadcastEvent = useCallback((event: Record<string, any>) => {
    adapterRef.current?.sendMove(event);
  }, []);

  // ── Non-host: apply remote state with swapped perspective ──
  const applyRemoteState = useCallback((remoteState: RummyState) => {
    // Swap hands so local player sees their hand at bottom
    const swapped: RummyState = {
      ...remoteState,
      hands: [remoteState.hands[1], remoteState.hands[0]],
      currentPlayer: 1 - remoteState.currentPlayer,
      scores: [remoteState.scores[1], remoteState.scores[0]],
      winner: remoteState.winner !== null ? 1 - remoteState.winner : null,
      knocker: remoteState.knocker !== null ? 1 - remoteState.knocker : null,
    };

    setState(swapped);
    rendererRef.current?.render(swapped);

    // Fix lastAction text: swap player references for joiner
    // The host uses "You"/"OpponentName", so joiner needs the opposite perspective
    let displayAction = remoteState.lastAction;
    // Replace action text with swapped perspective for display
    if (displayAction) {
      setMessage(displayAction);
    }

    if (swapped.phase === 'finished') {
      setGameOver(true);
      const won = swapped.winner === 0;
      SoundManager.getInstance().play(won ? 'game-win' : 'game-lose');
      recordGameRef.current('rummy', won, useGameStore.getState().multiplayerOpponentName || 'Opponent');
    } else if (swapped.phase === 'round-over') {
      setRoundOver(true);
    }
  }, []);

  // ── Multiplayer message handler ──
  const handleRemoteMessageRef = useRef<(data: any) => void>();
  handleRemoteMessageRef.current = (data: any) => {
    const game = gameRef.current;

    if (data.type === 'player-info') {
      setMultiplayerOpponentName(data.name);
      // Update renderer opponent name (don't re-render — it would kill any in-flight deal animation)
      if (rendererRef.current) {
        rendererRef.current.setOpponentName(data.name);
      }
      return;
    }

    if (data.type === 'resign') {
      setPlayerWon(true);
      setGameOver(true);
      SoundManager.getInstance().play('game-win');
      recordGameRef.current('rummy', true, useGameStore.getState().multiplayerOpponentName || 'Opponent');
      setMessage('Opponent resigned!');
      return;
    }

    if (isHost && game) {
      // Host receives moves from joiner (player 1)
      if (data.type === 'draw-pile') {
        if (game.drawFromPile()) {
          SoundManager.getInstance().play('card-deal');
          broadcastEvent({ type: 'card-drawn', player: 1, source: 'pile' });
          const ns = game.getState();
          setState({ ...ns });
          rendererRef.current?.render(ns);
          broadcastState(game);
        }
      } else if (data.type === 'draw-discard') {
        const s = game.getState();
        const topDiscard = s.discardPile.length > 0 ? s.discardPile[s.discardPile.length - 1] : null;
        if (game.drawFromDiscard()) {
          SoundManager.getInstance().play('card-deal');
          broadcastEvent({ type: 'card-drawn', player: 1, source: 'discard', card: topDiscard });
          const ns = game.getState();
          setState({ ...ns });
          rendererRef.current?.render(ns);
          broadcastState(game);
        }
      } else if (data.type === 'discard') {
        const card = game.getState().hands[1].find((c: Card) => c.id === data.cardId);
        if (card && game.discard(card)) {
          SoundManager.getInstance().play('card-flip');
          broadcastEvent({ type: 'card-discarded', player: 1, card });
          const ns = game.getState();
          setState({ ...ns });
          rendererRef.current?.render(ns);
          broadcastState(game);
          checkEndConditions(game);
        }
      } else if (data.type === 'knock') {
        if (game.enterKnockPhase()) {
          const ns = game.getState();
          setState({ ...ns });
          rendererRef.current?.render(ns);
          broadcastState(game);
        }
      } else if (data.type === 'cancel-knock') {
        game.cancelKnock();
        const ns = game.getState();
        setState({ ...ns });
        rendererRef.current?.render(ns);
        broadcastState(game);
      } else if (data.type === 'knock-discard') {
        const card = game.getState().hands[1].find((c: Card) => c.id === data.cardId);
        if (card && game.knockWithDiscard(card)) {
          SoundManager.getInstance().play('card-place');
          broadcastEvent({ type: 'card-discarded', player: 1, card, knock: true });
          const ns = game.getState();
          setState({ ...ns });
          rendererRef.current?.render(ns);
          broadcastState(game);
          checkEndConditions(game);
        }
      } else if (data.type === 'new-round') {
        game.newRound();
        setRoundOver(false);
        setMessage('');
        const s = game.getState();
        broadcastEvent({ type: 'deal-start', playerCount: s.hands[0].length, oppCount: s.hands[1].length });
        rendererRef.current?.playDealAnimation(s.hands[0].length, s.hands[1].length, () => {
          SoundManager.getInstance().play('card-deal');
          rendererRef.current?.render(game.getState());
          broadcastState(game);
        });
      }
    } else if (!isHost) {
      // Joiner receives events and state from host
      if (data.type === 'deal-start') {
        // Play deal animation on joiner, queue subsequent state
        animatingRef.current = true;
        pendingStateRef.current = null;
        const playerCount: number = data.oppCount || 10; // Joiner's hand = host's opp
        const oppCount: number = data.playerCount || 10; // Joiner's opp = host's player
        rendererRef.current?.playDealAnimation(playerCount, oppCount, () => {
          SoundManager.getInstance().play('card-deal');
          animatingRef.current = false;
          if (pendingStateRef.current) {
            const s = pendingStateRef.current;
            pendingStateRef.current = null;
            applyRemoteState(s);
          }
        });
      } else if (data.type === 'card-drawn') {
        // Host says a card was drawn — animate on joiner
        const hostPlayer: number = data.player;
        const source: string = data.source;
        // Swap player index for joiner perspective
        const localIdx = 1 - hostPlayer;
        SoundManager.getInstance().play('card-deal');
        rendererRef.current?.animateCardDraw(
          source === 'pile' ? 'pile' : 'discard',
          localIdx,
          data.card,
        );
      } else if (data.type === 'card-discarded') {
        // Host says a card was discarded — animate on joiner
        const hostPlayer: number = data.player;
        const card: Card = data.card;
        const localIdx = 1 - hostPlayer;
        SoundManager.getInstance().play('card-flip');
        rendererRef.current?.animateCardDiscard(localIdx, card);
      } else if (data.type === 'game-state') {
        const remoteState = data.state as RummyState;
        // If animating (deal), queue state
        if (animatingRef.current) {
          pendingStateRef.current = remoteState;
          return;
        }
        applyRemoteState(remoteState);
      }
    }
  };

  /** Check for end conditions after host processes a move */
  function checkEndConditions(game: RummyGame) {
    const s = game.getState();
    if (s.phase === 'finished') {
      setGameOver(true);
      const won = s.winner === 0;
      SoundManager.getInstance().play(won ? 'game-win' : 'game-lose');
      recordGameRef.current('rummy', won, useGameStore.getState().multiplayerOpponentName || 'Opponent');
    } else if (s.phase === 'round-over') {
      setRoundOver(true);
    }
  }

  // ── Multiplayer: setup adapter ──
  useEffect(() => {
    if (!isMultiplayer) return;

    const adapter = new MultiplayerGameAdapter('rummy');
    adapterRef.current = adapter;

    adapter.connect((data: any) => {
      handleRemoteMessageRef.current?.(data);
    });

    // Exchange names
    const profile = useAuthStore.getState().profile;
    const myName = profile?.display_name || 'Player';
    setTimeout(() => adapter.sendMove({ type: 'player-info', name: myName }), 300);

    return () => {
      adapter.disconnect();
      adapterRef.current = null;
    };
  }, [isMultiplayer]);

  // ── Canvas & game init ──
  useEffect(() => {
    if (!canvasRef.current) return;
    let destroyed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        width: 900,
        height: 600,
        backgroundColor: 0x155c2a,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (destroyed) { app.destroy(); return; }

      canvasRef.current!.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const game = new RummyGame();
      gameRef.current = game;

      const renderer = new RummyRenderer(app);
      rendererRef.current = renderer;

      if (isMultiplayer) {
        renderer.setMultiplayer(true);
        const oppName = useGameStore.getState().multiplayerOpponentName || 'Opponent';
        renderer.setOpponentName(oppName);

        if (isHost) {
          // Set player names for game engine messages
          game.setPlayerNames(['You', oppName]);

          // Host initializes and deals
          game.initialize();
          const s = game.getState();
          setState({ ...s });

          // Broadcast deal-start so joiner plays animation too
          broadcastEvent({ type: 'deal-start', playerCount: s.hands[0].length, oppCount: s.hands[1].length });
          renderer.playDealAnimation(s.hands[0].length, s.hands[1].length, () => {
            SoundManager.getInstance().play('card-deal');
            renderer.render(game.getState());
            broadcastState(game);
          });
        } else {
          // Joiner waits for state from host
          game.initialize(); // dummy init, will be overwritten by host state
          setState(game.getState());
        }
      } else {
        // Single player
        game.initialize();
        const s0 = game.getState();
        renderer.playDealAnimation(s0.hands[0].length, s0.hands[1].length, () => {
          SoundManager.getInstance().play('card-deal');
          const s = game.getState();
          setState({ ...s });
          renderer.render(s);
        });
      }

      renderer.setOnCardClick((card: Card, source: string) => {
        const s = gameRef.current?.getState();
        if (!s) return;
        if (s.phase === 'finished' || s.phase === 'round-over') return;

        if (isMultiplayer) {
          // In multiplayer, only interact on our turn
          // For non-host, use the swapped state to check turn
          const effectiveState = isHost ? s : stateRef.current;
          if (!effectiveState) return;
          const myTurn = isHost ? s.currentPlayer === 0 : effectiveState.currentPlayer === 0;
          if (!myTurn) return;

          if (isHost) {
            handleLocalMove(card, source, game, renderer);
          } else {
            // Joiner sends move to host
            if (effectiveState.phase === 'draw') {
              if (source === 'draw') {
                adapterRef.current?.sendMove({ type: 'draw-pile' });
                SoundManager.getInstance().play('card-deal');
              } else if (source === 'discard') {
                adapterRef.current?.sendMove({ type: 'draw-discard' });
                SoundManager.getInstance().play('card-deal');
              }
            } else if (effectiveState.phase === 'knock-discard' && source === 'hand') {
              adapterRef.current?.sendMove({ type: 'knock-discard', cardId: card.id });
              SoundManager.getInstance().play('card-place');
            } else if (effectiveState.phase === 'discard' && source === 'hand') {
              adapterRef.current?.sendMove({ type: 'discard', cardId: card.id });
              SoundManager.getInstance().play('card-flip');
            }
          }
        } else {
          // Single player: only play on player 0's turn
          if (s.currentPlayer !== 0) return;
          handleLocalMove(card, source, game, renderer);
        }
      });

      setState({ ...game.getState() });
    };

    function handleLocalMove(card: Card, source: string, game: RummyGame, renderer: RummyRenderer) {
      const s = game.getState();

      if (s.phase === 'draw') {
        if (source === 'draw') {
          SoundManager.getInstance().play('card-deal');
          if (!game.drawFromPile()) {
            const newState = game.getState();
            setState({ ...newState });
            renderer.render(newState);
            setMessage(newState.lastAction);
            if (newState.phase === 'round-over') setRoundOver(true);
            if (isMultiplayer && isHost) {
              broadcastEvent({ type: 'card-drawn', player: 0, source: 'pile' });
              broadcastState(game);
            }
            return;
          }
          if (isMultiplayer && isHost) {
            broadcastEvent({ type: 'card-drawn', player: 0, source: 'pile' });
          }
        } else if (source === 'discard') {
          SoundManager.getInstance().play('card-deal');
          const topDiscard = s.discardPile.length > 0 ? s.discardPile[s.discardPile.length - 1] : null;
          game.drawFromDiscard();
          if (isMultiplayer && isHost) {
            broadcastEvent({ type: 'card-drawn', player: 0, source: 'discard', card: topDiscard });
          }
        } else {
          return;
        }
        const newState = game.getState();
        setState({ ...newState });
        renderer.render(newState);
        if (isMultiplayer && isHost) broadcastState(game);
      } else if (s.phase === 'knock-discard' && source === 'hand') {
        if (game.knockWithDiscard(card)) {
          SoundManager.getInstance().play('card-place');
          if (isMultiplayer && isHost) {
            broadcastEvent({ type: 'card-discarded', player: 0, card, knock: true });
          }
          const newState = game.getState();
          setState({ ...newState });
          renderer.render(newState);
          setMessage(newState.lastAction);
          if (isMultiplayer && isHost) broadcastState(game);
          if (newState.phase === 'finished') {
            setGameOver(true);
            const won = newState.winner === localPlayer;
            SoundManager.getInstance().play(won ? 'game-win' : 'game-lose');
            recordGameRef.current('rummy', won, isMultiplayer ? (multiplayerOpponentName || 'Opponent') : (selectedOpponent?.name ?? 'AI'));
          } else if (newState.phase === 'round-over') {
            setRoundOver(true);
          }
        } else {
          setMessage('That discard would not allow a valid knock. Pick another card.');
        }
      } else if (s.phase === 'discard' && source === 'hand') {
        SoundManager.getInstance().play('card-flip');
        game.discard(card);
        if (isMultiplayer && isHost) {
          broadcastEvent({ type: 'card-discarded', player: 0, card });
        }
        const newState = game.getState();
        setState({ ...newState });
        renderer.render(newState);
        setMessage(newState.lastAction);
        if (isMultiplayer && isHost) broadcastState(game);

        if (newState.phase === 'finished') {
          setGameOver(true);
          const won = newState.winner === localPlayer;
          SoundManager.getInstance().play(won ? 'game-win' : 'game-lose');
          recordGameRef.current('rummy', won, isMultiplayer ? (multiplayerOpponentName || 'Opponent') : (selectedOpponent?.name ?? 'AI'));
        } else if (newState.phase === 'round-over') {
          setRoundOver(true);
        } else if (!isMultiplayer && newState.currentPlayer === 1) {
          aiTurnRef.current?.(game, renderer);
        }
      }
    }

    init();
    return () => {
      destroyed = true;
      adapterRef.current?.disconnect();
      rendererRef.current?.destroy();
      if (appRef.current) { appRef.current.destroy(true); appRef.current = null; }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKnock = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;

    if (isMultiplayer && !isHost) {
      adapterRef.current?.sendMove({ type: 'knock' });
      return;
    }

    if (game.enterKnockPhase()) {
      const s = game.getState();
      setState({ ...s });
      renderer.render(s);
      setMessage('Knock! Select a card to discard.');
      if (isMultiplayer && isHost) broadcastState(game);
    }
  };

  const handleCancelKnock = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;

    if (isMultiplayer && !isHost) {
      adapterRef.current?.sendMove({ type: 'cancel-knock' });
      return;
    }

    game.cancelKnock();
    const s = game.getState();
    setState({ ...s });
    renderer.render(s);
    setMessage('');
    if (isMultiplayer && isHost) broadcastState(game);
  };

  const handleNewRound = () => {
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;

    if (isMultiplayer && !isHost) {
      adapterRef.current?.sendMove({ type: 'new-round' });
      return;
    }

    setRoundOver(false);
    setMessage('');

    if (isMultiplayer && isHost) {
      game.newRound();
      const s = game.getState();
      setState({ ...s });
      broadcastEvent({ type: 'deal-start', playerCount: s.hands[0].length, oppCount: s.hands[1].length });
      renderer.playDealAnimation(s.hands[0].length, s.hands[1].length, () => {
        SoundManager.getInstance().play('card-deal');
        renderer.render(game.getState());
        broadcastState(game);
      });
    } else {
      // Single player
      game.newRound();
      const s = game.getState();
      setState({ ...s });
      renderer.playDealAnimation(s.hands[0].length, s.hands[1].length, () => {
        SoundManager.getInstance().play('card-deal');
        renderer.render(game.getState());
      });
    }
  };

  const handleNewGame = () => {
    if (isMultiplayer) return;
    const game = gameRef.current;
    const renderer = rendererRef.current;
    if (!game || !renderer) return;
    setGameOver(false);
    setRoundOver(false);
    setMessage('');
    game.initialize();
    const s = game.getState();
    setState({ ...s });
    renderer.playDealAnimation(s.hands[0].length, s.hands[1].length, () => {
      SoundManager.getInstance().play('card-deal');
      renderer.render(game.getState());
    });
  };

  const handleResign = () => {
    if (!isMultiplayer || gameOver) return;
    adapterRef.current?.sendMove({ type: 'resign' });
    setPlayerWon(false);
    setGameOver(true);
    SoundManager.getInstance().play('game-lose');
    recordGameRef.current('rummy', false, multiplayerOpponentName || 'Opponent');
  };

  const opponentName = isMultiplayer ? (multiplayerOpponentName || 'Opponent') : (selectedOpponent?.name ?? 'AI');
  const isLocalTurn = state ? state.currentPlayer === 0 : false;

  // Determine phase/turn text for header
  const turnText = isMultiplayer
    ? (isLocalTurn ? 'Your turn' : `${opponentName}'s turn`)
    : state?.phase === 'draw' && state.currentPlayer === 0
      ? 'Draw a card'
      : state?.phase === 'discard' && state.currentPlayer === 0
        ? 'Discard a card'
        : state?.phase === 'knock-discard' && state.currentPlayer === 0
          ? 'Discard for knock'
          : '';

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-4">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[900px] flex items-center justify-between mb-3">
        <button onClick={() => {
          if (isMultiplayer && !gameOver) {
            if (!window.confirm('Leaving will count as a resignation. Are you sure?')) return;
            adapterRef.current?.sendMove({ type: 'resign' });
          }
          navigate('/lobby/rummy');
        }} className="text-sm text-white/50 hover:text-white/80 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg">{'\u2190'} Back</button>
        <h2 className="text-lg font-display font-bold text-white">Gin Rummy</h2>
        <span className="text-sm text-white/60">{turnText}</span>
      </motion.div>

      {/* Player info bar */}
      <div className="w-full max-w-[900px] flex justify-between items-center mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm">
            {isMultiplayer ? '\u{1F464}' : '\u{1F916}'}
          </div>
          <div className="text-xs text-white/60">{opponentName}</div>
          <div className="text-xs text-white/40 ml-1">Score: <span className="text-white font-bold">{state?.scores[1] ?? 0}</span></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-white/40 mr-1">Score: <span className="text-white font-bold">{state?.scores[0] ?? 0}</span></div>
          <div className="text-xs text-white/60">You</div>
          <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-sm">{'\u265A'}</div>
        </div>
      </div>

      {message && <div className="w-full max-w-[900px] text-center text-sm text-amber-400 mb-2">{message}</div>}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="game-canvas-container" style={{ maxWidth: 900, aspectRatio: '900 / 600' }}>
        <div ref={canvasRef} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[900px] flex items-center justify-center gap-3 mt-3">
        {state?.phase === 'discard' && state.currentPlayer === 0 && gameRef.current?.canKnock() && (
          <button onClick={handleKnock} className="btn-primary text-sm py-2 px-4">
            {gameRef.current?.isGin() ? 'Gin!' : 'Knock'}
          </button>
        )}
        {state?.phase === 'knock-discard' && state.currentPlayer === 0 && (
          <button onClick={handleCancelKnock} className="btn-secondary text-sm py-2 px-4">
            Cancel Knock
          </button>
        )}
        {state?.phase === 'round-over' && !gameOver && (
          <button onClick={handleNewRound} className="btn-primary text-sm py-2 px-4">
            Next Round
          </button>
        )}
        {!isMultiplayer && (
          <button onClick={handleNewGame} className="btn-secondary text-sm py-2 px-4">New Game</button>
        )}
        {isMultiplayer && !gameOver && (
          <button onClick={handleResign} className="btn-secondary text-sm py-2 px-4 text-red-400 hover:text-red-300">
            Resign
          </button>
        )}
      </motion.div>

      <GameOverModal
        isOpen={gameOver}
        won={playerWon ?? (state?.winner === 0) ?? false}
        title={playerWon === true
          ? 'Opponent Resigned - You Win!'
          : playerWon === false
            ? 'You Resigned'
            : state?.winner === 0 ? 'You Win!' : state?.winner === 1 ? `${opponentName} Wins!` : 'Draw!'}
        gameId="rummy"
        stats={state ? [
          { label: 'Your Score', value: state.scores[0].toString() },
          { label: `${opponentName} Score`, value: state.scores[1].toString() },
        ] : []}
        onPlayAgain={isMultiplayer ? undefined : handleNewGame}
      />
    </div>
  );
}
