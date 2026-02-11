import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ACADEMY_COURSES, AcademyCourse } from './ChessAcademy';
import { useUserStore } from '../../stores/userStore';

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  master: 'Master',
};

function CourseCard({ course }: { course: AcademyCourse }) {
  const navigate = useNavigate();
  const { getCourseProgress, academyProgress } = useUserStore();
  const progress = getCourseProgress(course.id, course.lessons.length);
  const hasCert = academyProgress.certificates.includes(course.id);
  const hasLessons = course.lessons.length > 0;

  const handleClick = () => {
    if (!hasLessons) return;
    // Find first incomplete lesson, or first lesson
    const firstIncomplete = course.lessons.find(
      (l) => !useUserStore.getState().isLessonComplete(course.id, l.id)
    );
    const target = firstIncomplete ?? course.lessons[0];
    navigate(`/academy/chess/${course.id}/${target.id}`);
  };

  return (
    <button
      onClick={handleClick}
      disabled={!hasLessons}
      className="w-full text-left p-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ borderLeftColor: course.color, borderLeftWidth: 3 }}
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl">{course.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white font-bold text-sm group-hover:text-amber-400 transition-colors">
              {course.name}
            </span>
            {hasCert && <span className="text-xs">✓</span>}
          </div>
          <p className="text-white/40 text-xs mb-2">{course.description}</p>
          <div className="flex items-center gap-3">
            <span
              className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded"
              style={{ backgroundColor: course.color + '22', color: course.color }}
            >
              {LEVEL_LABELS[course.level]}
            </span>
            <span className="text-[10px] text-white/30">{course.ratingRange}</span>
            {hasLessons && (
              <span className="text-[10px] text-white/30">{course.lessons.length} lessons</span>
            )}
            {!hasLessons && (
              <span className="text-[10px] text-white/30 italic">Coming soon</span>
            )}
          </div>
          {hasLessons && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-white/40 mb-1">
                <span>{progress.completed}/{progress.total} lessons</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress.percent}%`,
                    backgroundColor: course.color,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export default function ChessAcademyPage() {
  const navigate = useNavigate();
  const { academyProgress } = useUserStore();

  const totalLessons = ACADEMY_COURSES.reduce((sum, c) => sum + c.lessons.length, 0);
  const completedLessons = academyProgress.completedLessons.length;

  // Find next incomplete lesson across all courses
  const findNextLesson = () => {
    for (const course of ACADEMY_COURSES) {
      for (const lesson of course.lessons) {
        if (!useUserStore.getState().isLessonComplete(course.id, lesson.id)) {
          return { courseId: course.id, lessonId: lesson.id };
        }
      }
    }
    return null;
  };

  const nextLesson = findNextLesson();

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate('/lobby/chess')}
            className="text-sm text-white/40 hover:text-white/70 transition-colors mb-4 block"
          >
            {'\u2190'} Back to Chess
          </button>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Chess Academy</h1>
              <p className="text-sm text-white/40 mt-1">
                {completedLessons}/{totalLessons} lessons completed
              </p>
            </div>
            {nextLesson && (
              <button
                onClick={() => navigate(`/academy/chess/${nextLesson.courseId}/${nextLesson.lessonId}`)}
                className="btn-primary text-sm px-5 py-2.5"
              >
                Continue Learning {'\u2192'}
              </button>
            )}
          </div>

          {/* Overall progress bar */}
          <div className="mt-4 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0}%` }}
            />
          </div>
        </motion.div>

        {/* Course Grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10"
        >
          {ACADEMY_COURSES.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </motion.div>

        {/* Certificates */}
        {academyProgress.certificates.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-sm text-white/50 uppercase tracking-wider mb-3">Certificates Earned</h2>
            <div className="flex flex-wrap gap-3">
              {academyProgress.certificates.map((courseId) => {
                const course = ACADEMY_COURSES.find((c) => c.id === courseId);
                if (!course) return null;
                return (
                  <div
                    key={courseId}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-500/30 bg-amber-500/10"
                  >
                    <span>{course.certificate.icon}</span>
                    <span className="text-sm text-amber-400 font-medium">{course.certificate.name}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
