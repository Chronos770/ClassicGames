import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Application } from 'pixi.js';
import { motion, AnimatePresence } from 'framer-motion';
import { ChessGame } from './ChessGame';
import { ChessRenderer } from './ChessRenderer';
import { Square } from './rules';
import { getCourse, getLesson, getNextLesson, AcademyStep } from './ChessAcademy';
import { useUserStore } from '../../stores/userStore';

export default function ChessTrainingPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const rendererRef = useRef<ChessRenderer | null>(null);
  const gameRef = useRef<ChessGame>(new ChessGame());

  const [stepIndex, setStepIndex] = useState(0);
  const [boardReady, setBoardReady] = useState(false);

  const course = courseId ? getCourse(courseId) : undefined;
  const lesson = courseId && lessonId ? getLesson(courseId, lessonId) : undefined;
  const steps = lesson?.steps ?? [];
  const currentStep = steps[stepIndex] ?? null;
  const totalSteps = steps.length;

  const { completeLesson, isLessonComplete } = useUserStore();

  // Initialize PixiJS
  useEffect(() => {
    if (!canvasRef.current) return;
    let destroyed = false;

    const init = async () => {
      const app = new Application();
      await app.init({
        width: 800,
        height: 800,
        backgroundColor: 0x3d2b1f,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      if (destroyed) { app.destroy(); return; }

      canvasRef.current!.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;

      const renderer = new ChessRenderer(app, gameRef.current);
      rendererRef.current = renderer;
      renderer.setOnMove((_from: Square, _to: Square) => { /* no-op */ });

      setBoardReady(true);
    };

    init();
    return () => {
      destroyed = true;
      if (appRef.current) { appRef.current.destroy(true); appRef.current = null; }
    };
  }, []);

  const renderWithArrowsAndHighlights = useCallback((step: AcademyStep) => {
    const renderer = rendererRef.current;
    const game = gameRef.current;
    if (!renderer) return;

    renderer.render(game.getState());

    if (step.arrows) {
      for (const arrow of step.arrows) {
        renderer.showHint(arrow.from as Square, arrow.to as Square);
      }
    }
    if (step.highlights) {
      for (const sq of step.highlights) {
        renderer.showHint(sq as Square, sq as Square);
      }
    }
  }, []);

  // When lesson changes, reset board
  useEffect(() => {
    if (!boardReady || !lesson) return;
    setStepIndex(0);
    // If first step has a fen, load it; otherwise reset to starting position
    const firstStep = lesson.steps[0];
    if (firstStep?.fen) {
      gameRef.current.getChess().load(firstStep.fen);
    } else {
      gameRef.current.initialize();
    }
    renderWithArrowsAndHighlights(lesson.steps[0]);
  }, [boardReady, lessonId, courseId, lesson, renderWithArrowsAndHighlights]);

  const goToStep = useCallback((newIndex: number) => {
    if (!lesson) return;
    if (newIndex < 0 || newIndex >= lesson.steps.length) return;

    const targetStep = lesson.steps[newIndex];

    // If step has its own FEN, load that directly
    if (targetStep.fen) {
      gameRef.current.getChess().load(targetStep.fen);
    } else {
      // Replay all moves from the beginning up to this step
      gameRef.current.initialize();
      const chess = gameRef.current.getChess();
      for (let i = 0; i <= newIndex; i++) {
        const step = lesson.steps[i];
        if (step.fen && i < newIndex) {
          chess.load(step.fen);
        } else if (step.move) {
          try { chess.move(step.move); } catch { /* skip invalid */ }
        }
      }
    }

    setStepIndex(newIndex);
    renderWithArrowsAndHighlights(targetStep);
  }, [lesson, renderWithArrowsAndHighlights]);

  const handleNext = () => goToStep(stepIndex + 1);
  const handlePrev = () => goToStep(stepIndex - 1);

  const handleComplete = () => {
    if (!courseId || !lessonId || !course) return;
    completeLesson(courseId, lessonId, course.lessons.length);
    const next = getNextLesson(courseId, lessonId);
    if (next) {
      navigate(`/academy/chess/${next.courseId}/${next.lessonId}`);
    } else {
      navigate('/academy/chess');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (stepIndex === totalSteps - 1) {
          handleComplete();
        } else {
          goToStep(stepIndex + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToStep(stepIndex - 1);
      } else if (e.key === 'Escape') {
        navigate('/academy/chess');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [stepIndex, totalSteps]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!course || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">Lesson not found</p>
          <button onClick={() => navigate('/academy/chess')} className="btn-primary text-sm">
            Back to Academy
          </button>
        </div>
      </div>
    );
  }

  const lessonIndex = course.lessons.findIndex((l) => l.id === lessonId);
  const isLastStep = stepIndex === totalSteps - 1;

  return (
    <div className="min-h-screen flex flex-col items-center py-4 px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[1120px] flex items-center justify-between mb-4"
      >
        <button
          onClick={() => navigate('/academy/chess')}
          className="text-sm text-white/40 hover:text-white/70 transition-colors"
        >
          {'\u2190'} Academy
        </button>
        <h2 className="text-lg font-display font-bold text-white truncate mx-4">
          {course.name}
          <span className="text-white/30 font-normal text-sm ml-2">
            Lesson {lessonIndex + 1} of {course.lessons.length}
          </span>
        </h2>
        <div className="text-sm text-white/40">
          {stepIndex + 1} / {totalSteps}
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-4 items-start w-full max-w-[1120px]">
        {/* Chess Board */}
        <div className="w-full lg:flex-1 min-w-0 flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="game-canvas-container w-full"
            style={{ maxWidth: 800, aspectRatio: '1 / 1' }}
          >
            <div ref={canvasRef} />
          </motion.div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
          {/* Step content */}
          <AnimatePresence mode="wait">
            {currentStep && (
              <motion.div
                key={`step-${stepIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="glass-panel !p-5">
                  <div className="flex items-center gap-2 mb-3">
                    {currentStep.move && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-sm font-bold">
                        {currentStep.move}
                      </span>
                    )}
                    <h3 className="text-base font-bold text-white">{currentStep.title}</h3>
                  </div>
                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
                    {currentStep.explanation}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress bar */}
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            <button
              onClick={handlePrev}
              disabled={stepIndex === 0}
              className="btn-secondary flex-1 text-sm py-2 disabled:opacity-30"
            >
              {'\u2190'} Previous
            </button>
            {isLastStep ? (
              <button onClick={handleComplete} className="btn-primary flex-1 text-sm py-2">
                Complete & Next {'\u2192'}
              </button>
            ) : (
              <button onClick={handleNext} className="btn-primary flex-1 text-sm py-2">
                Next {'\u2192'}
              </button>
            )}
          </div>

          <p className="text-xs text-white/30 text-center">
            Arrow keys or Space to navigate
          </p>

          {/* Course lesson sidebar */}
          <div className="glass-panel !p-3 max-h-60 overflow-y-auto">
            <h4 className="text-xs text-white/40 uppercase tracking-wider mb-2">Lessons</h4>
            {course.lessons.map((l, i) => {
              const complete = isLessonComplete(course.id, l.id);
              const isCurrent = l.id === lessonId;
              return (
                <button
                  key={l.id}
                  onClick={() => navigate(`/academy/chess/${course.id}/${l.id}`)}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors flex items-center gap-2 ${
                    isCurrent
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  <span className="w-4 text-center flex-shrink-0">
                    {complete ? '\u2713' : `${i + 1}`}
                  </span>
                  <span className="truncate">{l.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
