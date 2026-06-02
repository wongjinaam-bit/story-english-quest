export type Skill = "listen" | "speak" | "read" | "write";

export type UserRole = "student" | "teacher" | "admin";

export type Word = {
  word: string;
  meaning: string;
  part: string;
  image: string;
  example: string;
  translation: string;
  level: string;
};

export type StorySentence = {
  en: string;
  zh: string;
  image: string;
};

export type ChoiceQuestion = {
  id: string;
  skill: Skill;
  type: "choice" | "trueFalse" | "fill";
  prompt: string;
  answer: string;
  options: string[];
  audio?: string;
};

export type SpeakingTask = {
  id: string;
  prompt: string;
  target: string;
};

export type WritingTask = {
  id: string;
  prompt: string;
  starter: string;
  answerHint: string;
};

export type Lesson = {
  id: string;
  title: string;
  topic: string;
  level: number;
  cover: string;
  pattern: string;
  sentences: StorySentence[];
  words: Word[];
  listen: ChoiceQuestion[];
  read: ChoiceQuestion[];
  speak: SpeakingTask[];
  write: WritingTask[];
};

export type StudentProgress = {
  stars: number;
  streak: number;
  completedLessons: string[];
  completedSkills: Record<string, Skill[]>;
  mistakes: Record<string, { label: string; skill: Skill; count: number; nextReview: string }>;
  answers: { lessonId: string; skill: Skill; correct: boolean; date: string }[];
  badges: string[];
};

export type StudentSession = {
  id: string;
  authId?: string;
  name: string;
  code: string;
  avatar: string;
  loginAt: string;
  mode: "local" | "supabase";
};

export type Profile = {
  id: string;
  name: string;
  username: string | null;
  role: UserRole;
  avatar: string | null;
  class_id: string | null;
  last_seen_at: string | null;
};
