import type { LearningLevel, Lesson } from "@/lib/types";

export const learningLevelLabels: Record<LearningLevel, string> = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "高級"
};

export const learningLevelDescriptions: Record<LearningLevel, string> = {
  beginner: "適合剛開始學英文的學生，重點是聽音、認字、簡單句型。",
  intermediate: "適合已有基礎單字量的學生，加入短故事、句子理解和拼字。",
  advanced: "適合高年級學生，加入更多題型、閱讀理解、推論和短寫作。"
};

const rank: Record<LearningLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3
};

export function lessonDifficulty(lesson: Pick<Lesson, "level" | "difficulty">): LearningLevel {
  if (lesson.difficulty) return lesson.difficulty;
  if (lesson.level >= 3) return "advanced";
  if (lesson.level >= 2) return "intermediate";
  return "beginner";
}

export function canStudentSeeLesson(studentLevel: LearningLevel, lesson: Lesson, assigned = false) {
  if (assigned) return true;
  return rank[lessonDifficulty(lesson)] <= rank[studentLevel];
}

export function defaultLearningLevel(value?: string | null): LearningLevel {
  if (value === "intermediate" || value === "advanced") return value;
  return "beginner";
}
