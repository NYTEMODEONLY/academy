// NYTEMODE Academy - Progress Tracking

const STORAGE_KEY = 'nytemode_academy_progress';

const Progress = {
  get() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { courses: {}, user: {} };
  },

  save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  markLessonComplete(courseSlug, lessonSlug) {
    const data = this.get();
    if (!data.courses[courseSlug]) {
      data.courses[courseSlug] = { lessons: {}, started: new Date().toISOString() };
    }
    data.courses[courseSlug].lessons[lessonSlug] = {
      completed: true,
      completedAt: new Date().toISOString()
    };
    this.save(data);
    this.updateUI();
  },

  isLessonComplete(courseSlug, lessonSlug) {
    const data = this.get();
    return data.courses[courseSlug]?.lessons[lessonSlug]?.completed || false;
  },

  getCourseProgress(courseSlug, totalLessons) {
    const data = this.get();
    const course = data.courses[courseSlug];
    if (!course) return 0;
    const completed = Object.values(course.lessons).filter(l => l.completed).length;
    return Math.round((completed / totalLessons) * 100);
  },

  getCompletedCount(courseSlug) {
    const data = this.get();
    const course = data.courses[courseSlug];
    if (!course) return 0;
    return Object.values(course.lessons).filter(l => l.completed).length;
  },

  updateUI() {
    // Update lesson status icons
    document.querySelectorAll('[data-lesson-status]').forEach(el => {
      const course = el.dataset.course;
      const lesson = el.dataset.lesson;
      if (this.isLessonComplete(course, lesson)) {
        el.classList.add('completed');
        const statusEl = el.querySelector('.lesson-status');
        if (statusEl && !statusEl.classList.contains('locked')) {
          statusEl.classList.add('completed');
          statusEl.innerHTML = '✓';
        }
      }
    });

    // Update progress bars
    document.querySelectorAll('[data-course-progress]').forEach(el => {
      const courseSlug = el.dataset.courseProgress;
      const lessonItems = document.querySelectorAll(`[data-lesson-status][data-course="${courseSlug}"]`);
      const totalLessons = lessonItems.length;
      const progress = this.getCourseProgress(courseSlug, totalLessons);
      el.style.width = `${progress}%`;
    });

    // Update completed counts
    document.querySelectorAll('[data-completed-count]').forEach(el => {
      const courseSlug = el.dataset.completedCount;
      const count = this.getCompletedCount(courseSlug);
      el.textContent = count;
    });

    // Update mark complete button
    const completeBtn = document.querySelector('[data-mark-complete]');
    if (completeBtn) {
      const course = completeBtn.dataset.course;
      const lesson = completeBtn.dataset.lesson;
      if (this.isLessonComplete(course, lesson)) {
        completeBtn.textContent = 'Completed ✓';
        completeBtn.disabled = true;
        completeBtn.classList.remove('btn-accent');
        completeBtn.classList.add('btn-outline');
      }
    }
  }
};

// Mark as complete button handler
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-mark-complete]');
  if (btn && !btn.disabled) {
    const course = btn.dataset.course;
    const lesson = btn.dataset.lesson;
    Progress.markLessonComplete(course, lesson);
  }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  Progress.updateUI();
});

// Make Progress available globally
window.Progress = Progress;
