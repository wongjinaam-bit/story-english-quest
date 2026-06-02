import { supabase } from "@/lib/supabase";
import type { Skill, StudentProgress, StudentSession } from "@/lib/types";

const currentStudentKey = "seq-current-student";

function emptyProgress(): StudentProgress {
  return {
    stars: 0,
    streak: 0,
    completedLessons: [],
    completedSkills: {},
    mistakes: {},
    answers: [],
    badges: []
  };
}

function progressKey(studentId: string) {
  return `seq-progress-${studentId}`;
}

export function usernameToEmail(username: string) {
  return `${username.trim().replace(/\s+/g, "").toLowerCase()}@story-english-quest.local`;
}

export function cleanUsername(username: string) {
  return username.trim().replace(/\s+/g, "").toLowerCase();
}

export function loadStudentSession(): StudentSession | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(currentStudentKey) || "null");
  } catch {
    return null;
  }
}

export function saveStudentSession(student: StudentSession) {
  if (typeof window !== "undefined") {
    localStorage.setItem(currentStudentKey, JSON.stringify(student));
  }
}

export function clearStudentSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(currentStudentKey);
  }
}

export function loadLocalProgress(studentId = "guest"): StudentProgress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    return { ...emptyProgress(), ...JSON.parse(localStorage.getItem(progressKey(studentId)) || "{}") };
  } catch {
    return emptyProgress();
  }
}

export function saveLocalProgress(progress: StudentProgress, studentId = "guest") {
  if (typeof window !== "undefined") {
    localStorage.setItem(progressKey(studentId), JSON.stringify(progress));
  }
}

export async function loadCloudProgress(studentId: string): Promise<StudentProgress> {
  if (!supabase) return loadLocalProgress(studentId);
  const { data, error } = await supabase
    .from("student_app_state")
    .select("progress")
    .eq("student_id", studentId)
    .maybeSingle();

  if (error) {
    console.warn("Could not load cloud progress", error.message);
    return loadLocalProgress(studentId);
  }

  return { ...emptyProgress(), ...(data?.progress as Partial<StudentProgress> | null) };
}

export async function saveCloudProgress(studentId: string, progress: StudentProgress) {
  saveLocalProgress(progress, studentId);
  if (!supabase) return;

  const { error } = await supabase
    .from("student_app_state")
    .upsert({
      student_id: studentId,
      progress,
      updated_at: new Date().toISOString()
    });

  if (error) console.warn("Could not save cloud progress", error.message);
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
