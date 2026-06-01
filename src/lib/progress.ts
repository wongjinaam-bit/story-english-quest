import type { Skill, StudentProgress } from "@/lib/types";

const emptyProgress: StudentProgress = {
  stars: 0,
  streak: 0,
  completedLessons: [],
  completedSkills: {},
  mistakes: {},
  answers: [],
  badges: []
};

export function loadProgress(): StudentProgress {
  if (typeof window === "undefined") return emptyProgress;
  try {
    return { ...emptyProgress, ...JSON.parse(localStorage.getItem("seq-progress") || "{}") };
  } catch {
    return emptyProgress;
  }
}

export function saveProgress(progress: StudentProgress) {
  if (typeof window !== "undefined") {
    localStorage.setItem("seq-progress", JSON.stringify(progress));
  }
}

export function recordSkill(progress: StudentProgress, lessonId: string, skill: Skill) {
  const skills = new Set(progress.completedSkills[lessonId] || []);
  skills.add(skill);
  progress.completedSkills[lessonId] = Array.from(skills);
  if (skills.size >= 4 && !progress.completedLessons.includes(lessonId)) {
    progress.completedLessons.push(lessonId);
    progress.stars += 10;
  }
  updateBadges(progress);
}

export function recordAnswer(progress: StudentProgress, lessonId: string, skill: Skill, label: string, correct: boolean) {
  progress.answers.push({ lessonId, skill, correct, date: new Date().toISOString() });
  if (correct) {
    progress.stars += 1;
    if (progress.mistakes[label]) {
      const item = progress.mistakes[label];
      item.count = Math.max(0, item.count - 1);
      item.nextReview = nextReviewDate(item.count <= 1 ? 3 : 7);
      if (item.count === 0) delete progress.mistakes[label];
    }
  } else {
    progress.mistakes[label] = {
      label,
      skill,
      count: (progress.mistakes[label]?.count || 0) + 1,
      nextReview: nextReviewDate(1)
    };
  }
  updateBadges(progress);
}

function nextReviewDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function updateBadges(progress: StudentProgress) {
  const badges = new Set(progress.badges);
  if (progress.stars >= 1) badges.add("First Star 第一顆星");
  if (progress.completedLessons.length >= 1) badges.add("Story Starter 故事新手");
  if (progress.completedLessons.length >= 3) badges.add("Quest Explorer 任務探險家");
  if (progress.stars >= 50) badges.add("Star Collector 星星收藏家");
  progress.badges = Array.from(badges);
}
