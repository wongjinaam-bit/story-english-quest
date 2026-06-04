"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Headphones, LogOut, Mic, QrCode, Sparkles, Star, UserRound } from "lucide-react";
import { appLessons } from "@/data/lessons";
import { isSupabaseReady, signInStudent, signOut, signUpStudent } from "@/lib/auth";
import { mergePublishedLessons } from "@/lib/course-drafts";
import { defaultLearningLevel, learningLevelDescriptions, learningLevelLabels, lessonDifficulty } from "@/lib/learning-levels";
import { supabase } from "@/lib/supabase";
import {
  clearStudentSession,
  loadCloudProgress,
  loadLocalProgress,
  loadStudentSession,
  recordAnswer,
  recordSkill,
  saveCloudProgress,
  saveStudentSession
} from "@/lib/progress";
import type { AppAssignment, ChoiceQuestion, CourseDraft, LearningLevel, Lesson, Skill, SpeakingTask, StudentProgress, StudentSession, Word, WritingTask } from "@/lib/types";

type Screen = "home" | "map" | "story" | "questVocab" | "vocab" | "listen" | "speak" | "read" | "write" | "dialogue" | "review" | "progress";

type QuizTaskState = {
  index: number;
  feedback: string;
  picked: string;
  pickedById?: Record<string, string>;
  feedbackById?: Record<string, string>;
};

type SpeakTaskState = {
  index?: number;
  done: Record<string, boolean>;
  heard: Record<string, boolean>;
  tries: Record<string, number>;
  transcripts?: Record<string, string>;
  scores?: Record<string, number>;
  feedback?: Record<string, string>;
};

type WritingFeedback = {
  mood: "great" | "good" | "try";
  title: string;
  notes: string[];
  nextStep: string;
};

type DialogueMessage = {
  role: "ai" | "student";
  text: string;
};

type DialogueScenario = {
  id: string;
  title: string;
  topic: string;
  cover: string;
  role: string;
  voice: "male" | "female";
  level: LearningLevel;
  opening: string;
  goal: string;
  sampleReplies: string[];
  setting: string;
};

type WriteTaskState = {
  index: number;
  answers: Record<string, string>;
  checked: Record<string, { correct: boolean; correctAnswer: string }>;
  aiTips: Record<string, WritingFeedback>;
};

type OwlHelp = {
  lessonTitle: string;
  skill: Skill;
  answer: string;
  note: string;
};

type StudentTaskDraft = {
  lessonId: string;
  screen: Screen;
  quizTaskStates: Record<string, QuizTaskState>;
  speakTaskStates: Record<string, SpeakTaskState>;
  writeTaskStates: Record<string, WriteTaskState>;
  helpUsed: Record<string, Partial<Record<Skill, boolean>>>;
  currentLessonScreens: Record<string, Screen>;
};

const taskScreens = new Set<Screen>(["story", "questVocab", "listen", "speak", "read", "write"]);
const taskScreenRank: Partial<Record<Screen, number>> = {
  story: 1,
  questVocab: 2,
  listen: 3,
  speak: 4,
  read: 5,
  write: 6
};

const courseWorlds = [
  { level: 1, key: "forest", icon: "🌱", title: "Level 1 綠意森林", subtitle: "新手村冒險，從日常單字和短句開始。" },
  { level: 2, key: "ocean", icon: "🌊", title: "Level 2 晴空海洋", subtitle: "出海探索小故事，練習更完整的句子。" },
  { level: 3, key: "castle", icon: "🔮", title: "Level 3 魔法城堡", subtitle: "挑戰短文閱讀、語法和更高階任務。" }
] as const;

const navItems: { id: Screen; label: string; icon: string; cuteLabel: string }[] = [
  { id: "home", label: "今日任務", icon: "⭐", cuteLabel: "任務卷軸" },
  { id: "map", label: "課程地圖", icon: "🗺️", cuteLabel: "冒險地圖" },
  { id: "story", label: "故事", icon: "📖", cuteLabel: "故事書" },
  { id: "vocab", label: "單字", icon: "🔤", cuteLabel: "字母卡" },
  { id: "dialogue", label: "情境對話", icon: "💬", cuteLabel: "AI 對話" },
  { id: "review", label: "再挑戰", icon: "🚩", cuteLabel: "勇氣挑戰" },
  { id: "progress", label: "進度", icon: "🏆", cuteLabel: "星星進度" }
];

const skillQuestSteps: { skill?: Skill; label: string; icon: string; screen: Screen }[] = [
  { label: "故事", icon: "📖", screen: "story" },
  { label: "單字", icon: "🔤", screen: "questVocab" },
  { skill: "listen", label: "聽力", icon: "🎧", screen: "listen" },
  { skill: "speak", label: "口說", icon: "🎙️", screen: "speak" },
  { skill: "read", label: "閱讀", icon: "📚", screen: "read" },
  { skill: "write", label: "寫作", icon: "✏️", screen: "write" }
];

const skillLabels: Record<Skill, string> = {
  listen: "聽",
  speak: "說",
  read: "讀",
  write: "寫"
};

const levelToWorld: Record<LearningLevel, 1 | 2 | 3> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3
};

const learningLevelRank: Record<LearningLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3
};

const avatars = ["⭐", "🚀", "🌈", "📚", "🎯", "🏆"];

const dialogueScenarios: DialogueScenario[] = [
  {
    id: "hotel-check-in",
    title: "去酒店入住",
    topic: "Travel",
    cover: "🏨",
    role: "Hotel receptionist",
    voice: "female",
    level: "intermediate",
    opening: "Good evening. Welcome to Star Hotel. Do you have a reservation?",
    goal: "練習入住、姓名、房間、早餐和付款。",
    sampleReplies: ["May I have your name, please?", "How many nights will you stay?", "Would you like breakfast tomorrow?"],
    setting: "A friendly hotel lobby. The student is checking in and may ask about rooms, breakfast, keys, payment, or directions."
  },
  {
    id: "restaurant-order",
    title: "在餐廳點餐",
    topic: "Food",
    cover: "🍽️",
    role: "Restaurant server",
    voice: "male",
    level: "beginner",
    opening: "Hello. Welcome to Sunny Cafe. What would you like to eat?",
    goal: "練習點餐、飲料、數量和禮貌表達。",
    sampleReplies: ["Would you like a drink?", "Do you want rice or noodles?", "Anything else?"],
    setting: "A bright family restaurant. The student orders food and drinks, changes choices, asks prices, and says thank you."
  },
  {
    id: "school-office",
    title: "到學校辦公室",
    topic: "School",
    cover: "🏫",
    role: "School office teacher",
    voice: "female",
    level: "beginner",
    opening: "Hi. How can I help you today?",
    goal: "練習問路、請求幫助、找老師。",
    sampleReplies: ["Which teacher are you looking for?", "What class are you in?", "Please wait here."],
    setting: "A school office. The student may look for a teacher, ask for directions, report a lost item, or ask for help."
  },
  {
    id: "doctor-visit",
    title: "看醫生",
    topic: "Health",
    cover: "🩺",
    role: "Doctor",
    voice: "male",
    level: "advanced",
    opening: "Hello. What seems to be the problem today?",
    goal: "練習描述身體不舒服、時間和建議。",
    sampleReplies: ["Where does it hurt?", "When did it start?", "You should drink water and rest."],
    setting: "A calm clinic. The student describes symptoms, asks questions, and receives simple health advice."
  },
  {
    id: "airport-security",
    title: "在機場過安檢",
    topic: "Travel",
    cover: "🛫",
    role: "Airport staff",
    voice: "female",
    level: "intermediate",
    opening: "Hello. Please put your bag on the tray. Do you have any liquids?",
    goal: "練習機場、行李、護照和簡單問題。",
    sampleReplies: ["May I see your passport?", "Where are you flying today?", "Please walk through the gate."],
    setting: "An airport security area. The student answers questions about bags, passport, destination, and travel plans."
  },
  {
    id: "library-help",
    title: "在圖書館借書",
    topic: "Reading",
    cover: "📚",
    role: "Librarian",
    voice: "female",
    level: "beginner",
    opening: "Hello. What kind of book are you looking for?",
    goal: "練習找書、借書、還書和喜好。",
    sampleReplies: ["Do you like animal stories?", "You can borrow this book for one week.", "Please bring your library card."],
    setting: "A quiet library. The student asks for a book, explains what they like, and borrows or returns books."
  },
  {
    id: "shopping-clothes",
    title: "買衣服",
    topic: "Shopping",
    cover: "👕",
    role: "Shop assistant",
    voice: "male",
    level: "intermediate",
    opening: "Hi. Are you looking for a shirt, a jacket, or something else?",
    goal: "練習尺寸、顏色、價錢和試穿。",
    sampleReplies: ["What size do you need?", "Would you like to try it on?", "This one is on sale today."],
    setting: "A clothes shop. The student chooses clothes, asks about size and color, and decides whether to buy."
  },
  {
    id: "bus-station",
    title: "搭巴士問路",
    topic: "City",
    cover: "🚌",
    role: "Bus driver",
    voice: "male",
    level: "beginner",
    opening: "Hello. Where do you want to go?",
    goal: "練習地點、方向、車票和時間。",
    sampleReplies: ["This bus goes to the park.", "The ticket is two dollars.", "Please get off at the next stop."],
    setting: "A bus stop. The student asks where to go, buys a ticket, and checks the stop."
  },
  {
    id: "museum-tour",
    title: "參觀博物館",
    topic: "Culture",
    cover: "🏛️",
    role: "Museum guide",
    voice: "female",
    level: "advanced",
    opening: "Welcome to the museum. Which exhibit would you like to see first?",
    goal: "練習提問、描述展品、表達看法。",
    sampleReplies: ["This painting is very old.", "What do you notice about it?", "Please do not touch the exhibit."],
    setting: "A museum tour. The student asks about exhibits, describes what they see, and shares opinions."
  }
];

function emptyTaskDraft(): StudentTaskDraft {
  return {
    lessonId: appLessons[0].id,
    screen: "home",
    quizTaskStates: {},
    speakTaskStates: {},
    writeTaskStates: {},
    helpUsed: {},
    currentLessonScreens: {}
  };
}

function taskDraftKey(studentId: string) {
  return `seq-task-draft-${studentId}`;
}

function loadTaskDraft(studentId: string): StudentTaskDraft {
  if (typeof window === "undefined") return emptyTaskDraft();
  try {
    const draft = { ...emptyTaskDraft(), ...JSON.parse(localStorage.getItem(taskDraftKey(studentId)) || "{}") };
    if (draft.screen === "vocab") draft.screen = "questVocab";
    draft.currentLessonScreens = Object.fromEntries(
      Object.entries(draft.currentLessonScreens || {}).map(([lessonId, savedScreen]) => [
        lessonId,
        savedScreen === "vocab" ? "questVocab" : savedScreen
      ])
    ) as Record<string, Screen>;
    return draft;
  } catch {
    return emptyTaskDraft();
  }
}

function saveTaskDraft(studentId: string, draft: StudentTaskDraft) {
  if (typeof window !== "undefined") {
    localStorage.setItem(taskDraftKey(studentId), JSON.stringify(draft));
  }
}

export function StudentApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [lessonId, setLessonId] = useState(appLessons[0].id);
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [showZh, setShowZh] = useState(true);
  const [speed, setSpeed] = useState(0.85);
  const [assignments, setAssignments] = useState<AppAssignment[]>([]);
  const [cloudStatus, setCloudStatus] = useState("");
  const [allLessons, setAllLessons] = useState<Lesson[]>(appLessons);
  const [celebrationLesson, setCelebrationLesson] = useState<Lesson | null>(null);
  const [quizTaskStates, setQuizTaskStates] = useState<Record<string, QuizTaskState>>({});
  const [speakTaskStates, setSpeakTaskStates] = useState<Record<string, SpeakTaskState>>({});
  const [writeTaskStates, setWriteTaskStates] = useState<Record<string, WriteTaskState>>({});
  const [helpUsed, setHelpUsed] = useState<Record<string, Partial<Record<Skill, boolean>>>>({});
  const [currentLessonScreens, setCurrentLessonScreens] = useState<Record<string, Screen>>({});
  const [taskDraftReady, setTaskDraftReady] = useState(false);
  const [owlHelp, setOwlHelp] = useState<OwlHelp | null>(null);
  const [lockedHint, setLockedHint] = useState<{ id: string; message: string } | null>(null);
  const [mapWorldLevel, setMapWorldLevel] = useState<1 | 2 | 3>(1);
  const [pendingNavigation, setPendingNavigation] = useState<Screen | null>(null);
  const [pendingReplayLesson, setPendingReplayLesson] = useState<Lesson | null>(null);
  const [activeScenario, setActiveScenario] = useState<DialogueScenario | null>(null);
  const [dialogueMessages, setDialogueMessages] = useState<DialogueMessage[]>([]);
  const [dialogueExitOpen, setDialogueExitOpen] = useState(false);
  const studentLearningLevel = defaultLearningLevel(student?.proficiencyLevel);
  const lessons = useMemo(() => {
    if (!student) return allLessons;
    const assignedIds = new Set(assignments.filter((assignment) => assignment.skill !== "dialogue").map((assignment) => assignment.lesson_id));
    const completedIds = new Set(progress?.completedLessons || []);
    const levelComplete = (level: LearningLevel) => {
      const levelLessons = allLessons.filter((item) => lessonDifficulty(item) === level);
      return levelLessons.length > 0 && levelLessons.every((item) => completedIds.has(item.id));
    };
    let visibleRank = learningLevelRank[studentLearningLevel];
    if (levelComplete("beginner")) visibleRank = Math.max(visibleRank, learningLevelRank.intermediate);
    if (levelComplete("intermediate")) visibleRank = Math.max(visibleRank, learningLevelRank.advanced);
    return sortCourseMapLessons(allLessons.filter((item) => {
      if (assignedIds.has(item.id)) return true;
      return learningLevelRank[lessonDifficulty(item)] <= visibleRank;
    }));
  }, [allLessons, assignments, progress?.completedLessons, student, studentLearningLevel]);
  const preferredStartLesson = useMemo(
    () => lessons.find((item) => lessonDifficulty(item) === studentLearningLevel) || lessons[0] || appLessons[0],
    [lessons, studentLearningLevel]
  );
  const assignedDialogueIds = useMemo(
    () => new Set(assignments.filter((assignment) => assignment.skill === "dialogue").map((assignment) => assignment.lesson_id)),
    [assignments]
  );
  const lesson = useMemo(() => lessons.find((item) => item.id === lessonId) || preferredStartLesson, [lessonId, lessons, preferredStartLesson]);
  const practicedLessonIds = useMemo(() => new Set([
    ...(progress?.completedLessons || []),
    ...Object.keys(progress?.completedSkills || {}),
    ...(progress?.answers || []).map((item) => item.lessonId)
  ].filter(Boolean)), [progress]);
  const learnedWords = useMemo(() => {
    const seen = new Set<string>();
    return allLessons
      .filter((item) => practicedLessonIds.has(item.id))
      .flatMap((item) => item.words.map((word) => ({ ...word, lessonTitle: item.title, lessonId: item.id })))
      .filter((word) => {
        const key = `${word.lessonId}-${word.word}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [allLessons, practicedLessonIds]);
  const listenQuestions = useMemo(() => buildLessonPracticeQuestions(lesson, "listen"), [lesson]);
  const readQuestions = useMemo(() => buildLessonPracticeQuestions(lesson, "read"), [lesson]);

  const loadPublishedCourses = useCallback(async () => {
    if (!supabase) return appLessons;
    const { data, error } = await supabase
      .from("course_drafts")
      .select("*")
      .eq("status", "published")
      .order("updated_at", { ascending: false });
    if (error) {
      setCloudStatus(`課程更新提醒：${error.message}`);
      return appLessons;
    }
    const nextLessons = mergePublishedLessons(appLessons, (data || []) as CourseDraft[]);
    setAllLessons(nextLessons);
    return nextLessons;
  }, []);

  useEffect(() => {
    setMapWorldLevel(levelToWorld[studentLearningLevel]);
  }, [studentLearningLevel]);

  useEffect(() => {
    if (!lessons.length || !taskDraftReady || !progress) return;
    const currentLesson = lessons.find((item) => item.id === lessonId);
    if (!currentLesson) {
      setLessonId(preferredStartLesson.id);
      return;
    }
    const hasLearningHistory =
      progress.completedLessons.length > 0 ||
      Object.keys(progress.completedSkills).length > 0 ||
      progress.answers.length > 0;
    if (
      !hasLearningHistory &&
      !taskScreens.has(screen) &&
      lessonDifficulty(currentLesson) !== studentLearningLevel &&
      preferredStartLesson.id !== lessonId
    ) {
      setLessonId(preferredStartLesson.id);
    }
  }, [lessonId, lessons, preferredStartLesson, progress, screen, studentLearningLevel, taskDraftReady]);

  const loadStudentAssignments = useCallback(async () => {
    if (!student || student.mode !== "supabase" || !supabase) {
      setAssignments([]);
      return;
    }
    const { data, error } = await supabase
      .from("app_assignments")
      .select("*")
      .eq("student_id", student.id)
      .eq("status", "assigned")
      .order("created_at", { ascending: false });
    if (error) {
      setCloudStatus(`任務更新提醒：${error.message}`);
      return;
    }
    setAssignments((data || []) as AppAssignment[]);
  }, [student]);

  function restoreTaskDraft(studentId: string) {
    const draft = loadTaskDraft(studentId);
    setQuizTaskStates(draft.quizTaskStates || {});
    setSpeakTaskStates(draft.speakTaskStates || {});
    setWriteTaskStates(draft.writeTaskStates || {});
    setHelpUsed(draft.helpUsed || {});
    setCurrentLessonScreens(draft.currentLessonScreens || {});
    setLessonId(draft.lessonId || appLessons[0].id);
    setScreen(draft.screen || "home");
    setTaskDraftReady(true);
  }

  useEffect(() => {
    const savedStudent = loadStudentSession();
    if (savedStudent) {
      setStudent(savedStudent);
      restoreTaskDraft(savedStudent.id);
      loadCloudProgress(savedStudent.id).then(setProgress);
    }
  }, []);

  useEffect(() => {
    if (!student || !taskDraftReady) return;
    saveTaskDraft(student.id, {
      lessonId,
      screen,
      quizTaskStates,
      speakTaskStates,
      writeTaskStates,
      helpUsed,
      currentLessonScreens
    });
  }, [currentLessonScreens, helpUsed, lessonId, quizTaskStates, screen, speakTaskStates, student, taskDraftReady, writeTaskStates]);

  useEffect(() => {
    if (!student || !taskDraftReady || !taskScreens.has(screen)) return;
    setCurrentLessonScreens((current) => {
      if (current[lessonId] === screen) return current;
      const currentRank = taskScreenRank[current[lessonId]] || 0;
      const nextRank = taskScreenRank[screen] || 0;
      if (currentRank > nextRank) return current;
      return { ...current, [lessonId]: screen };
    });
  }, [lessonId, screen, student, taskDraftReady]);

  useEffect(() => {
    if (student && progress) {
      saveCloudProgress(student.id, progress).then((result) => setCloudStatus(result.message));
    }
  }, [progress, student]);

  useEffect(() => {
    if (!student) return;
    loadPublishedCourses();
    loadStudentAssignments();
  }, [loadPublishedCourses, loadStudentAssignments, student]);

  useEffect(() => {
    if (screen === "map") {
      loadPublishedCourses();
    }
  }, [loadPublishedCourses, screen]);

  useEffect(() => {
    if (screen === "home" || screen === "map") {
      loadStudentAssignments();
    }
  }, [loadStudentAssignments, screen]);

  useEffect(() => {
    if (!student || student.mode !== "supabase") return;
    const timer = window.setInterval(() => {
      loadStudentAssignments();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadStudentAssignments, student]);

  useEffect(() => {
    if (!celebrationLesson) return;
    const timer = window.setTimeout(() => setCelebrationLesson(null), 5000);
    return () => window.clearTimeout(timer);
  }, [celebrationLesson]);

  async function enterStudent(nextStudent: StudentSession) {
    saveStudentSession(nextStudent);
    setStudent(nextStudent);
    restoreTaskDraft(nextStudent.id);
    setProgress(await loadCloudProgress(nextStudent.id));
  }

  async function logoutStudent() {
    await signOut();
    clearStudentSession();
    setStudent(null);
    setProgress(null);
    setScreen("home");
  }

  if (!student || !progress) {
    return <StudentLogin onEnter={enterStudent} />;
  }

  const activeStudent = student;
  const lessonSkills = progress.completedSkills[lesson.id] || [];
  const nextSkill = (["listen", "speak", "read", "write"] as Skill[]).find((skill) => !lessonSkills.includes(skill));
  const questActive = taskScreens.has(screen) && !progress.completedLessons.includes(lesson.id);
  const preferredMapLessons = [
    ...lessons.filter((item) => lessonDifficulty(item) === studentLearningLevel),
    ...lessons.filter((item) => lessonDifficulty(item) !== studentLearningLevel)
  ];
  const activeMapLessonId = preferredMapLessons.find((item) => {
    const assigned = assignments.some((assignment) => assignment.lesson_id === item.id);
    const unlockState = getLessonUnlockState(item, lessons, progress.completedLessons, assigned, studentLearningLevel);
    return unlockState.unlocked && !progress.completedLessons.includes(item.id);
  })?.id || lesson.id;
  const recommendedScreen: Screen = resumeScreenForLesson(lesson.id);
  const recommendedLabel = !lessonSkills.length
    ? "開始故事任務"
    : nextSkill
      ? `繼續${taskName(nextSkill)}`
      : "查看學習成果";

  function mutateProgress(mutator: (draft: StudentProgress) => void) {
    setProgress((current) => {
      const next = structuredClone(current || loadLocalProgress(activeStudent.id));
      mutator(next);
      return next;
    });
  }

  function speak(text: string, rate = speed, voiceHint?: "male" | "female") {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((voice) => {
      const name = voice.name.toLowerCase();
      if (voiceHint === "female") return name.includes("female") || name.includes("zira") || name.includes("samantha") || name.includes("jenny");
      if (voiceHint === "male") return name.includes("male") || name.includes("david") || name.includes("guy") || name.includes("daniel");
      return false;
    });
    if (preferredVoice) utterance.voice = preferredVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function completeSkill(skill: Skill) {
    if (!progress) return;
    const nextSkills = new Set([...(progress.completedSkills[lesson.id] || []), skill]);
    const justCompletedLesson = nextSkills.size >= 4 && !progress.completedLessons.includes(lesson.id);
    mutateProgress((draft) => recordSkill(draft, lesson.id, skill));
    if (justCompletedLesson) {
      setCelebrationLesson(lesson);
    }
    completeMatchingAssignments(lesson.id, skill, nextSkills.size >= 4);
  }

  function answerQuestion(question: ChoiceQuestion, answer: string) {
    const correct = answer === question.answer;
    mutateProgress((draft) => recordAnswer(draft, lesson.id, question.skill, question.prompt, correct, answer, question.answer));
    return correct;
  }

  function markVocabulary(word: string, known: boolean) {
    mutateProgress((draft) => recordAnswer(draft, lesson.id, "read", `單字：${word}`, known, known ? "我會了" : "需要複習", word));
  }

  function answerReview(label: string, skill: Skill, correct: boolean, reviewLessonId = lesson.id, answer = correct ? "我會了" : "再練一次", correctAnswer = "") {
    mutateProgress((draft) => recordAnswer(draft, reviewLessonId, skill, label, correct, answer, correctAnswer));
  }

  function answerPractice(skill: Skill, label: string, correct: boolean, answer: string, correctAnswer: string) {
    mutateProgress((draft) => recordAnswer(draft, lesson.id, skill, label, correct, answer, correctAnswer));
  }

  function taskStateKey(skill: Skill, targetLessonId = lesson.id) {
    return `${targetLessonId}:${skill}`;
  }

  function quizStateFor(skill: Skill): QuizTaskState {
    return quizTaskStates[taskStateKey(skill)] || { index: 0, feedback: "", picked: "" };
  }

  function updateQuizState(skill: Skill, nextState: QuizTaskState) {
    setQuizTaskStates((current) => ({ ...current, [taskStateKey(skill)]: nextState }));
  }

  function speakStateFor(): SpeakTaskState {
    return speakTaskStates[taskStateKey("speak")] || { done: {}, heard: {}, tries: {} };
  }

  function updateSpeakState(nextState: SpeakTaskState) {
    setSpeakTaskStates((current) => ({ ...current, [taskStateKey("speak")]: nextState }));
  }

  function writeStateFor(): WriteTaskState {
    return writeTaskStates[taskStateKey("write")] || { index: 0, answers: {}, checked: {}, aiTips: {} };
  }

  function updateWriteState(nextState: WriteTaskState) {
    setWriteTaskStates((current) => ({ ...current, [taskStateKey("write")]: nextState }));
  }

  function hasUsedHelp(skill: Skill) {
    return Boolean(helpUsed[lesson.id]?.[skill]);
  }

  function showOwlHelp(skill: Skill, answer: string, note: string) {
    if (hasUsedHelp(skill) || !answer) return;
    setHelpUsed((current) => ({
      ...current,
      [lesson.id]: {
        ...(current[lesson.id] || {}),
        [skill]: true
      }
    }));
    setOwlHelp({ lessonTitle: lesson.title, skill, answer, note });
  }

  function resumeScreenForLesson(targetLessonId: string): Screen {
    const savedScreen = currentLessonScreens[targetLessonId] === "vocab" ? "questVocab" : currentLessonScreens[targetLessonId];
    if (savedScreen && taskScreens.has(savedScreen)) return savedScreen;
    const savedSkills = progress?.completedSkills[targetLessonId] || [];
    if (!savedSkills.length) return "story";
    const unfinishedSkill = (["listen", "speak", "read", "write"] as Skill[]).find((skill) => !savedSkills.includes(skill));
    return unfinishedSkill || "progress";
  }

  function nextWithoutRegressing(targetLessonId: string, targetScreen: Screen): Screen {
    const savedScreen = currentLessonScreens[targetLessonId] === "vocab" ? "questVocab" : currentLessonScreens[targetLessonId];
    const savedRank = taskScreenRank[savedScreen] || 0;
    const targetRank = taskScreenRank[targetScreen] || 0;
    return savedRank > targetRank ? savedScreen : targetScreen;
  }

  function openLessonAtResume(targetLessonId: string) {
    setLessonId(targetLessonId);
    setScreen(resumeScreenForLesson(targetLessonId));
  }

  function showLockedLessonHint(targetLessonId: string, message: string) {
    setLockedHint(null);
    window.setTimeout(() => setLockedHint({ id: targetLessonId, message }), 0);
  }

  function requestNavigation(targetScreen: Screen) {
    if (targetScreen === screen) return;
    const nextScreen = targetScreen === "story" ? resumeScreenForLesson(lesson.id) : targetScreen;
    if (nextScreen === screen) return;
    if (questActive) {
      setPendingNavigation(nextScreen);
      return;
    }
    setScreen(nextScreen);
  }

  function confirmNavigationAway() {
    if (pendingNavigation) {
      setScreen(pendingNavigation);
    }
    setPendingNavigation(null);
  }

  async function startAssignment(assignment: AppAssignment) {
    if (assignment.skill === "dialogue") {
      const scenario = dialogueScenarios.find((item) => item.id === assignment.lesson_id);
      if (!scenario) {
        setCloudStatus("老師指定的情境任務不存在，請老師重新指定。");
        return;
      }
      setActiveScenario(scenario);
      const firstMessage = { role: "ai" as const, text: scenario.opening };
      setDialogueMessages([firstMessage]);
      setScreen("dialogue");
      window.setTimeout(() => speak(scenario.opening, 0.88, scenario.voice), 120);
      return;
    }
    const nextLessons = await loadPublishedCourses();
    if (!nextLessons.some((item) => item.id === assignment.lesson_id)) {
      setCloudStatus("任務課程尚未發布到學生端，請老師先到課程內容管理發布這門課。");
      return;
    }
    setLessonId(assignment.lesson_id);
    setScreen(assignment.skill === "all" ? resumeScreenForLesson(assignment.lesson_id) : assignment.skill);
  }

  async function completeMatchingAssignments(completedLessonId: string, completedSkill: Skill, lessonCompleted: boolean) {
    const doneAssignments = assignments.filter((assignment) =>
      assignment.skill !== "dialogue" &&
      assignment.lesson_id === completedLessonId &&
      (assignment.skill === completedSkill || (assignment.skill === "all" && lessonCompleted))
    );
    if (!doneAssignments.length || !supabase) return;
    const ids = doneAssignments.map((assignment) => assignment.id);
    setAssignments((current) => current.filter((assignment) => !ids.includes(assignment.id)));
    await supabase
      .from("app_assignments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .in("id", ids);
  }

  async function completeDialogueAssignments(scenarioId: string) {
    const doneAssignments = assignments.filter((assignment) => assignment.skill === "dialogue" && assignment.lesson_id === scenarioId);
    if (!doneAssignments.length || !supabase) return;
    const ids = doneAssignments.map((assignment) => assignment.id);
    setAssignments((current) => current.filter((assignment) => !ids.includes(assignment.id)));
    const { error } = await supabase
      .from("app_assignments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .in("id", ids);
    setCloudStatus(error ? `情境任務完成狀態更新失敗：${error.message}` : "情境任務已完成，老師端可以看到完成狀態。");
  }

  function resetLessonForReplay(targetLesson: Lesson) {
    setQuizTaskStates((current) => {
      const next = { ...current };
      delete next[`${targetLesson.id}:listen`];
      delete next[`${targetLesson.id}:read`];
      return next;
    });
    setSpeakTaskStates((current) => {
      const next = { ...current };
      delete next[`${targetLesson.id}:speak`];
      return next;
    });
    setWriteTaskStates((current) => {
      const next = { ...current };
      delete next[`${targetLesson.id}:write`];
      return next;
    });
    setHelpUsed((current) => {
      const next = { ...current };
      delete next[targetLesson.id];
      return next;
    });
    setCurrentLessonScreens((current) => ({ ...current, [targetLesson.id]: "story" }));
    mutateProgress((draft) => {
      draft.completedSkills[targetLesson.id] = [];
    });
    setLessonId(targetLesson.id);
    setScreen("story");
    setPendingReplayLesson(null);
  }

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <div className="brand-logo"><OwlMark /></div>
          <div>
            <h1>Story English Quest</h1>
            <p>迷你故事英文任務</p>
          </div>
        </div>

        <div className="student-chip">
          <span>{student.avatar}</span>
          <div>
            <strong>{student.name}</strong>
            <small>{student.mode === "supabase" ? "雲端帳號" : "本機模式"}：{student.code}</small>
            <small>{learningLevelLabels[defaultLearningLevel(student.proficiencyLevel)]}課程</small>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button key={item.id} className={screen === item.id || (item.id === "story" && taskScreens.has(screen)) ? "active" : ""} onClick={() => requestNavigation(item.id)}>
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-copy">
                <strong>{item.label}{item.id === "home" && assignments.length ? `（${assignments.length}）` : ""}</strong>
                <small>{item.cuteLabel}</small>
              </span>
            </button>
          ))}
          <a className="btn secondary full" href="/qr"><QrCode size={18} /> QR Code</a>
          <a className="btn secondary full" href="/admin">教師後台</a>
          <button className="btn secondary full" onClick={logoutStudent}><LogOut size={18} /> 登出 / 切換學生</button>
        </nav>

        <div className="side-card">
          <strong>{assignments.length ? `老師任務：${assignments.length} 個` : "今日目標"}</strong>
          <p className="muted">{assignments.length ? "請先完成老師指定任務。指定課程會優先開放。" : "完成故事、單字、聽說讀寫任務。"}</p>
        </div>
      </aside>

      <main className="main">
        {student.mode === "local" && (
          <div className="notice-box local-warning">
            <strong>目前是本機模式</strong>
            <p>這個模式的星星、進度和老師指定任務只存在這台裝置，教師後台看不到。要接收老師任務，請登出後用「學生註冊 / 學生登入」的雲端帳號進入。</p>
          </div>
        )}
        {student.mode === "supabase" && cloudStatus && !cloudStatus.includes("已保存") && (
          <div className="notice-box local-warning">
            <strong>雲端保存提醒</strong>
            <p>{cloudStatus}</p>
          </div>
        )}

        <header className="topbar">
          <div>
            <p className="eyebrow">For Primary Students</p>
            <h2>{titleFor(screen)}</h2>
          </div>
          <div className="stat-row">
            <div className="stat reward-stat"><span>⭐</span><strong>{progress.stars}</strong><small>星星寶箱</small></div>
            <div className="stat reward-stat"><span>🔥</span><strong>{progress.streak || 0}</strong><small>火焰連勝</small></div>
            <div className="stat reward-stat"><span>📖</span><strong>{progress.completedLessons.length}</strong><small>故事徽章</small></div>
            <div className="stat reward-stat"><span>🚩</span><strong>{Object.keys(progress.mistakes).length}</strong><small>勇氣值</small></div>
          </div>
        </header>

        {student.mode === "supabase" && assignments.length > 0 && screen !== "home" && (
          <div className="notice-box local-warning">
            <strong>老師指定任務</strong>
            <p>你有 {assignments.length} 個任務待完成。老師指定的課程會優先開放，即使課程地圖原本還未解鎖也可以開始。</p>
            <div className="btns">
              <button className="btn primary" type="button" onClick={() => startAssignment(assignments[0])}>開始最新任務</button>
              <button className="btn secondary" type="button" onClick={() => requestNavigation("home")}>查看全部任務</button>
            </div>
          </div>
        )}

        {screen === "home" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <div className="mission-kicker">
                  <span>Today&apos;s Mission</span>
                  <strong>Level {lesson.level}｜{lesson.topic}</strong>
                </div>
                <h3>{lesson.title}</h3>
                <div className="mission-title-card">
                  <span>Owl Quest</span>
                  <strong>{lesson.pattern}</strong>
                </div>
                <p>
                  嗨，{student.name}！歡迎來到英文小教室。跟著 Owl 老師完成聽、說、讀、寫四個任務，收集星星並解鎖下一個故事。
                </p>
                <div className="btns">
                  <button className="btn primary adventure-btn" onClick={() => setScreen(recommendedScreen)}><Sparkles size={18} /> 開始今天的冒險</button>
                  <button className="btn secondary adventure-btn" onClick={() => setScreen("map")}>打開冒險地圖</button>
                </div>
              </div>
              <ClassroomHero lesson={lesson} />
            </section>

            {assignments.length > 0 && (
              <>
                <div className="section-title">
                  <h3>老師指定任務</h3>
                  <div className="admin-actions">
                    <span className="pill blue">{assignments.length} 個任務</span>
                    <button className="btn secondary" type="button" onClick={loadStudentAssignments}>重新整理任務</button>
                  </div>
                </div>
                <div className="grid cards">
                  {assignments.map((item) => {
                    const isDialogueAssignment = item.skill === "dialogue";
                    const assignedLesson = lessons.find((lesson) => lesson.id === item.lesson_id);
                    const assignedScenario = dialogueScenarios.find((scenario) => scenario.id === item.lesson_id);
                    const assignmentName = isDialogueAssignment ? assignedScenario?.title : assignedLesson?.title;
                    return (
                      <article className="card assignment-card" key={item.id}>
                        <span className="pill">{item.skill === "all" ? "全部任務" : item.skill === "dialogue" ? "情境對話" : skillLabels[item.skill]}</span>
                        <h3>{assignmentName || item.lesson_id}</h3>
                        <p className="muted">
                          {item.due_date ? `截止日期：${item.due_date}` : "沒有截止日期"}
                          {item.note ? <><br />老師備註：{item.note}</> : null}
                        </p>
                        <button className="btn primary full" onClick={() => startAssignment(item)}>開始指定任務</button>
                      </article>
                    );
                  })}
                </div>
              </>
            )}

            <section className="quest-road">
              {skillQuestSteps.map((step, index) => {
                const done = step.skill
                  ? lessonSkills.includes(step.skill)
                  : lessonSkills.length > 0 || progress.completedLessons.includes(lesson.id);
                return (
                  <button className={done ? "quest-node done" : "quest-node"} key={step.label} onClick={() => setScreen(step.screen)}>
                    <span className="quest-icon">{done ? "⭐" : step.icon}</span>
                    <strong>{step.label}</strong>
                    <small>{done ? "已完成" : `第 ${index + 1} 關`}</small>
                  </button>
                );
              })}
            </section>

            <div className="section-title"><h3>四項任務進度</h3></div>
            <div className="grid cards">
              {(["listen", "speak", "read", "write"] as Skill[]).map((skill) => (
                <div className="card" key={skill}>
                  <span className="pill blue">{skillLabels[skill]}</span>
                  <h3>{taskName(skill)}</h3>
                  <p className="muted">{lessonSkills.includes(skill) ? "已完成，做得好！" : "尚未完成"}</p>
                  <div className="progress"><span style={{ width: lessonSkills.includes(skill) ? "100%" : "20%" }} /></div>
                  <button className="btn secondary full" onClick={() => setScreen(skill)}>
                    {lessonSkills.includes(skill) ? "再練一次" : "開始任務"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {screen === "map" && (
          <section className="world-map">
            <div className="map-hero">
              <div>
                <p className="eyebrow">Quest Map</p>
                <h3>故事冒險世界</h3>
                <p className="muted">沿著森林、海洋、魔法城堡一路前進。完成一關，就會解鎖下一個徽章節點。</p>
              </div>
              <div className="admin-actions">
                <span className="pill">完成一關解鎖下一關</span>
                <button className="btn secondary adventure-btn" type="button" onClick={loadPublishedCourses}>重新整理課程</button>
              </div>
            </div>

            <div className="world-tabs" role="tablist" aria-label="選擇課程等級">
              {courseWorlds.map((world) => {
                const worldLessonCount = lessons.filter((item) => item.level === world.level).length;
                const levelName = world.level === 1 ? "初級" : world.level === 2 ? "中級" : "高級";
                return (
                  <button
                    aria-selected={mapWorldLevel === world.level}
                    className={mapWorldLevel === world.level ? "active" : ""}
                    disabled={!worldLessonCount}
                    key={world.key}
                    onClick={() => setMapWorldLevel(world.level as 1 | 2 | 3)}
                    role="tab"
                    type="button"
                  >
                    <span>{world.icon}</span>
                    <strong>{levelName}</strong>
                    <small>{worldLessonCount} 個關卡</small>
                  </button>
                );
              })}
            </div>

            {courseWorlds.filter((world) => world.level === mapWorldLevel).map((world) => {
              const worldLessons = lessons.filter((item) => item.level === world.level);
              if (!worldLessons.length) return null;
              return (
                <section className={`map-world ${world.key}`} key={world.key}>
                  <div className="world-title">
                    <span>{world.icon}</span>
                    <div>
                      <h3>{world.title}</h3>
                      <p>{world.subtitle}</p>
                    </div>
                  </div>
                  <div className="world-route">
                    {worldLessons.map((item, worldIndex) => {
                      const completed = progress.completedLessons.includes(item.id);
                      const assigned = assignments.some((assignment) => assignment.lesson_id === item.id);
                      const unlockState = getLessonUnlockState(item, lessons, progress.completedLessons, assigned, studentLearningLevel);
                      const active = unlockState.unlocked && !completed && item.id === activeMapLessonId;
                      const routePosition = ["left", "mid", "right", "mid", "left"][worldIndex % 5];
                      const nodeClass = [
                        "map-node",
                        routePosition,
                        completed ? "passed" : "",
                        active ? "active" : "",
                        unlockState.unlocked ? "" : "locked",
                        lockedHint?.id === item.id ? "shake" : ""
                      ].filter(Boolean).join(" ");
                      return (
                        <div className={nodeClass} key={item.id}>
                          <button
                            className="node-badge"
                            type="button"
                            onClick={() => {
                              if (!unlockState.unlocked) {
                                showLockedLessonHint(item.id, unlockState.reason);
                                return;
                              }
                              if (completed) {
                                setPendingReplayLesson(item);
                                return;
                              }
                              openLessonAtResume(item.id);
                            }}
                          >
                            <span className="node-emoji">{unlockState.unlocked ? item.cover : "🔒"}</span>
                            {completed && <span className="node-crown">👑</span>}
                            {assigned && !completed && <span className="node-pin">📌</span>}
                          </button>
                          <div className="node-label">
                            <strong>{item.title}</strong>
                            <small>{item.topic} · Level {item.level}</small>
                            <em>{completed ? "Review story" : unlockState.unlocked ? "Tap to play" : "Locked"}</em>
                          </div>
                          {lockedHint?.id === item.id && <div className="locked-bubble">{lockedHint.message}</div>}
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </section>
        )}

        {screen === "story" && <Story lesson={lesson} showZh={showZh} setShowZh={setShowZh} speed={speed} setSpeed={setSpeed} speak={speak} next={() => setScreen(nextWithoutRegressing(lesson.id, "questVocab"))} />}
        {screen === "questVocab" && <Vocabulary lesson={lesson} learnedWords={learnedWords} speak={speak} questMode next={() => setScreen("listen")} onMark={markVocabulary} />}
        {screen === "vocab" && <Vocabulary lesson={lesson} learnedWords={learnedWords} speak={speak} />}
        {screen === "listen" && <QuizTask key={`${lesson.id}-listen`} lesson={lesson} skill="listen" questions={listenQuestions} speak={speak} state={quizStateFor("listen")} onStateChange={(nextState) => updateQuizState("listen", nextState)} sectionCompleted={lessonSkills.includes("listen")} helpUsed={hasUsedHelp("listen")} onHelp={(question) => showOwlHelp("listen", question.answer, `正確答案：${question.answer}`)} onAnswer={answerQuestion} onPrevSection={() => setScreen("questVocab")} onNextSection={() => setScreen("speak")} onDone={() => { completeSkill("listen"); setScreen("speak"); }} />}
        {screen === "speak" && <SpeakTask lesson={lesson} speak={speak} state={speakStateFor()} onStateChange={updateSpeakState} sectionCompleted={lessonSkills.includes("speak")} helpUsed={hasUsedHelp("speak")} onHelp={(answer) => showOwlHelp("speak", answer, `正確朗讀句：${answer}`)} onAnswer={answerPractice} onPrevSection={() => setScreen("listen")} onNextSection={() => setScreen("read")} onDone={() => { completeSkill("speak"); setScreen("read"); }} />}
        {screen === "read" && <QuizTask key={`${lesson.id}-read`} lesson={lesson} skill="read" questions={readQuestions} speak={speak} state={quizStateFor("read")} onStateChange={(nextState) => updateQuizState("read", nextState)} sectionCompleted={lessonSkills.includes("read")} helpUsed={hasUsedHelp("read")} onHelp={(question) => showOwlHelp("read", question.answer, `正確答案：${question.answer}`)} onAnswer={answerQuestion} onPrevSection={() => setScreen("speak")} onNextSection={() => setScreen("write")} onDone={() => { completeSkill("read"); setScreen("write"); }} />}
        {screen === "write" && <WriteTask lesson={lesson} state={writeStateFor()} onStateChange={updateWriteState} sectionCompleted={lessonSkills.includes("write")} helpUsed={hasUsedHelp("write")} onHelp={(answer) => showOwlHelp("write", answer, `正確答案：${answer}`)} onAnswer={answerPractice} onPrevSection={() => setScreen("read")} onDone={() => { completeSkill("write"); setScreen("progress"); }} />}
        {screen === "dialogue" && <ScenarioDialogue scenarios={dialogueScenarios} activeScenario={activeScenario} setActiveScenario={setActiveScenario} messages={dialogueMessages} setMessages={setDialogueMessages} exitOpen={dialogueExitOpen} setExitOpen={setDialogueExitOpen} studentId={student.id} speak={speak} assignedScenarioIds={assignedDialogueIds} onCompleteScenarioAssignment={completeDialogueAssignments} />}
        {screen === "review" && <Review progress={progress} lessons={allLessons} speak={speak} onAnswer={answerReview} />}
        {screen === "progress" && <Progress progress={progress} student={student} />}
      </main>
      {celebrationLesson && <Celebration lesson={celebrationLesson} streak={progress.streak} onClose={() => setCelebrationLesson(null)} />}
      {owlHelp && <OwlHelpDialog help={owlHelp} onClose={() => setOwlHelp(null)} />}
      {pendingNavigation && (
        <QuestLeavePrompt
          currentScreen={screen}
          lessonTitle={lesson.title}
          onCancel={() => setPendingNavigation(null)}
          onLeave={confirmNavigationAway}
        />
      )}
      {pendingReplayLesson && (
        <ReplayLessonPrompt
          lesson={pendingReplayLesson}
          onCancel={() => {
            setLessonId(pendingReplayLesson.id);
            setScreen(resumeScreenForLesson(pendingReplayLesson.id));
            setPendingReplayLesson(null);
          }}
          onReplay={() => resetLessonForReplay(pendingReplayLesson)}
        />
      )}
    </div>
  );
}

function getLessonUnlockState(item: Lesson, lessons: Lesson[], completedLessons: string[], assigned = false, studentLevel: LearningLevel = "beginner") {
  if (completedLessons.includes(item.id)) {
    return { unlocked: true, reason: "你已完成這一課。", lockLabel: "已完成" };
  }
  if (assigned) {
    return { unlocked: true, reason: "老師已指定這個任務，所以可以直接開始。", lockLabel: "開始老師任務" };
  }
  if (item.unlockMode === "open") {
    return { unlocked: true, reason: "老師設定為立即開放。", lockLabel: "可開始" };
  }
  if (item.unlockMode === "specific" && item.prerequisiteLessonId) {
    const prerequisite = lessons.find((lesson) => lesson.id === item.prerequisiteLessonId);
    const unlocked = completedLessons.includes(item.prerequisiteLessonId);
    return {
      unlocked,
      reason: unlocked ? `已完成前置課程：${prerequisite?.title || "指定課程"}` : `需先完成：${prerequisite?.title || "指定課程"}`,
      lockLabel: `先完成：${prerequisite?.title || "指定課程"}`
    };
  }
  const itemDifficulty = lessonDifficulty(item);
  const sameLevelLessons = lessons.filter((lesson) => lessonDifficulty(lesson) === itemDifficulty);
  const sameLevelIndex = sameLevelLessons.findIndex((lesson) => lesson.id === item.id);
  if (sameLevelIndex <= 0) {
    const isOwnLevelStart = itemDifficulty === studentLevel;
    return {
      unlocked: true,
      reason: isOwnLevelStart ? "這是你目前程度的第一關，可以直接開始。" : "這是這個程度的第一關，可以直接開始。",
      lockLabel: "可開始"
    };
  }
  const previous = sameLevelLessons[sameLevelIndex - 1];
  const unlocked = !previous || completedLessons.includes(previous.id);
  return {
    unlocked,
    reason: unlocked ? "已完成上一課，可以開始。" : `需先完成上一課：${previous.title}`,
    lockLabel: "先完成前一關"
  };
}

function QuestLeavePrompt({ currentScreen, lessonTitle, onCancel, onLeave }: {
  currentScreen: Screen;
  lessonTitle: string;
  onCancel: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="quest-guard-backdrop" role="dialog" aria-modal="true" aria-label="任務進行中提醒" onClick={onCancel}>
      <article className="quest-guard-card" onClick={(event) => event.stopPropagation()}>
        <div className="owl-help-teacher">
          <OwlMark />
          <div>
            <strong>Owl 老師提醒你</strong>
            <small>{lessonTitle} 正在進行中</small>
          </div>
        </div>
        <div className="quest-guard-bubble">
          <span>⚠️</span>
          <div>
            <h3>任務還在進行中喔！</h3>
            <p>
              你現在正在「{titleFor(currentScreen)}」。如果只是誤觸左邊選單，建議先繼續挑戰。
              系統已經幫你保存目前位置，真的要離開也可以之後再回來。
            </p>
          </div>
        </div>
        <div className="btns">
          <button className="btn primary adventure-btn" type="button" onClick={onCancel}>繼續挑戰</button>
          <button className="btn secondary adventure-btn" type="button" onClick={onLeave}>先離開</button>
        </div>
      </article>
    </div>
  );
}

function ReplayLessonPrompt({ lesson, onCancel, onReplay }: {
  lesson: Lesson;
  onCancel: () => void;
  onReplay: () => void;
}) {
  return (
    <div className="quest-guard-backdrop" role="dialog" aria-modal="true" aria-label="重新挑戰提醒" onClick={onCancel}>
      <article className="quest-guard-card" onClick={(event) => event.stopPropagation()}>
        <div className="owl-help-teacher">
          <OwlMark />
          <div>
            <strong>這一關已經完成</strong>
            <small>{lesson.title}</small>
          </div>
        </div>
        <div className="quest-guard-bubble">
          <span>👑</span>
          <div>
            <h3>要重新做這個單元嗎？</h3>
            <p>選「不用，回到原進度」會保留之前的答題狀態。選「重新挑戰」才會清除這一課的本次聽說讀寫進度；後面的關卡不會被重新鎖住。</p>
          </div>
        </div>
        <div className="btns">
          <button className="btn primary adventure-btn" type="button" onClick={onCancel}>不用，回到原進度</button>
          <button className="btn secondary adventure-btn" type="button" onClick={onReplay}>重新挑戰</button>
        </div>
      </article>
    </div>
  );
}

function sortCourseMapLessons(items: Lesson[]) {
  return [...items].sort((a, b) => {
    const levelDiff = a.level - b.level;
    if (levelDiff) return levelDiff;
    const sortDiff = (a.sortOrder || 999000) - (b.sortOrder || 999000);
    if (sortDiff) return sortDiff;
    return a.title.localeCompare(b.title);
  });
}

function OwlMark() {
  return (
    <div className="owl-mark" aria-hidden="true">
      <span className="owl-ear left" />
      <span className="owl-ear right" />
      <span className="owl-eye left" />
      <span className="owl-eye right" />
      <span className="owl-beak" />
      <span className="owl-cap" />
    </div>
  );
}

function ClassroomHero({ lesson }: { lesson: Lesson }) {
  return (
    <div className="classroom-scene" aria-label="英文教室插畫">
      <div className="classroom-wall">
        <div className="window-scene"><span /></div>
        <div className="abc-poster">ABC</div>
        <div className="blackboard">
          <strong>Today&apos;s Words</strong>
          <span>{lesson.words.slice(0, 3).map((word) => word.word).join(" · ") || lesson.topic}</span>
        </div>
        <div className="letter-wall">
          <b>A</b><b>B</b><b>C</b>
        </div>
      </div>
      <div className="shelf">
        <span className="book blue" />
        <span className="book pink" />
        <span className="book yellow" />
        <span className="plant">🌱</span>
      </div>
      <div className="desk-scene">
        <div className="word-card-mini">{lesson.words[0]?.word || "word"}</div>
        <div className="word-card-mini floating-two">{lesson.words[1]?.word || "star"}</div>
        <div className="pencil-mini" />
        <div className="book-mini">ABC</div>
      </div>
      <div className="owl-teacher">
        <div className="speech-bubble">Ready?</div>
        <div className="graduation-cap" />
        <div className="owl-body">
          <span className="owl-wing left" />
          <span className="owl-wing right" />
          <span className="owl-face">
            <i className="eye left" />
            <i className="eye right" />
            <i className="beak" />
          </span>
          <span className="bowtie" />
        </div>
      </div>
      <span className="scene-star star-one">★</span>
      <span className="scene-star star-two">★</span>
      <span className="scene-dot dot-one" />
      <span className="scene-dot dot-two" />
    </div>
  );
}

function Celebration({ lesson, streak, onClose }: { lesson: Lesson; streak: number; onClose: () => void }) {
  return (
    <div className="celebration-backdrop" role="button" tabIndex={0} onClick={onClose} onKeyDown={onClose}>
      <div className="celebration-card" onClick={(event) => event.stopPropagation()}>
        <div className="confetti">
          <span>★</span><span>●</span><span>◆</span><span>✦</span><span>●</span><span>★</span>
        </div>
        <div className="celebration-mascot">
          <span className="mascot-face">{lesson.cover}</span>
          <span className="sparkle sparkle-a">⭐</span>
          <span className="sparkle sparkle-b">🎉</span>
          <span className="sparkle sparkle-c">🌈</span>
        </div>
        <p className="eyebrow">Mission Complete</p>
        <h3>完成「{lesson.title}」！</h3>
        <p className="muted">今天已完成打卡。連續學習 {streak || 1} 天，繼續保持！</p>
        <button className="btn primary" onClick={onClose}>太棒了，繼續學習</button>
      </div>
    </div>
  );
}

function OwlHelpDialog({ help, onClose }: { help: OwlHelp; onClose: () => void }) {
  return (
    <div className="owl-help-backdrop" role="button" tabIndex={0} onClick={onClose} onKeyDown={onClose}>
      <div className="owl-help-card" onClick={(event) => event.stopPropagation()}>
        <div className="owl-help-teacher">
          <OwlMark />
          <span>Owl Teacher</span>
        </div>
        <div className="owl-help-bubble">
          <p className="eyebrow">{help.lessonTitle} · {skillLabels[help.skill]}求助</p>
          <h3>我給你一次提示答案：</h3>
          <div className="owl-answer">{help.answer}</div>
          <p className="muted">{help.note}</p>
        </div>
        <button className="btn primary full" type="button" onClick={onClose}>知道了，我自己再試一次</button>
      </div>
    </div>
  );
}

function buildLessonPracticeQuestions(lesson: Lesson, skill: "listen" | "read"): ChoiceQuestion[] {
  const words = lesson.words.length ? lesson.words : [{ word: lesson.title, meaning: lesson.topic, part: "noun", image: lesson.cover, example: lesson.pattern, translation: "", level: `Level ${lesson.level}` }];
  const meanings = unique([...words.map((item) => item.meaning), ...appLessons.flatMap((item) => item.words.map((word) => word.meaning))].filter(Boolean));
  const wordTexts = unique([...words.map((item) => item.word), ...appLessons.flatMap((item) => item.words.map((word) => word.word))].filter(Boolean));
  const sentences = unique(lesson.sentences.map((item) => item.en).filter(Boolean));
  const difficulty = lessonDifficulty(lesson);
  const firstWord = words[0];
  const secondWord = words[1] || firstWord;
  const thirdWord = words[2] || firstWord;
  const storyText = sentences.join(" ");

  if (skill === "listen") {
    const wordQuestions = words.slice(0, difficulty === "beginner" ? 4 : 2).map((word, index) => ({
      id: `${lesson.id}-generated-listen-word-${index + 1}`,
      skill,
      type: "choice" as const,
      prompt: `聽單字，選出意思：${word.word}`,
      answer: word.meaning,
      options: fillOptions(word.meaning, meanings),
      audio: word.word
    }));
    const sentence = sentences[0] || words[0].example || lesson.pattern;
    const sentenceQuestion: ChoiceQuestion = {
      id: `${lesson.id}-generated-listen-sentence`,
      skill,
      type: "choice",
      prompt: "聽句子，選出你聽到的英文句子",
      answer: sentence,
      options: fillOptions(sentence, sentences.length > 1 ? sentences : words.map((item) => item.example).filter(Boolean)),
      audio: sentence
    };
    const storyDetailQuestion: ChoiceQuestion = {
      id: `${lesson.id}-generated-listen-story-detail`,
      skill,
      type: "choice",
      prompt: difficulty === "advanced" ? "聽短文，選出正確細節" : "聽小故事，選出故事裡出現的內容",
      answer: secondWord.word,
      options: fillOptions(secondWord.word, wordTexts),
      audio: storyText || sentence
    };
    const listenGrammarQuestion: ChoiceQuestion = {
      id: `${lesson.id}-generated-listen-grammar`,
      skill,
      type: "choice",
      prompt: "聽句子，選出正確的 be 動詞",
      answer: "is",
      options: ["am", "is", "are", "be"],
      audio: `${firstWord.word} is important.`
    };
    return [
      ...wordQuestions,
      sentenceQuestion,
      ...(difficulty !== "beginner" ? [storyDetailQuestion] : []),
      ...(difficulty === "advanced" ? [listenGrammarQuestion] : [])
    ].slice(0, 5);
  }

  const wordMeaningQuestions = words.slice(0, difficulty === "beginner" ? 3 : 2).map((word, index) => ({
    id: `${lesson.id}-generated-read-word-${index + 1}`,
    skill,
    type: "choice" as const,
    prompt: `Which word means「${word.meaning}」?`,
    answer: word.word,
    options: fillOptions(word.word, wordTexts)
  }));
  const exampleWord = words[0];
  const sentenceQuestion: ChoiceQuestion = {
    id: `${lesson.id}-generated-read-sentence`,
    skill,
    type: "choice",
    prompt: `Choose the sentence about "${exampleWord.word}".`,
    answer: exampleWord.example,
    options: fillOptions(exampleWord.example, words.map((item) => item.example).filter(Boolean))
  };
  const storyQuestion: ChoiceQuestion = {
    id: `${lesson.id}-generated-read-story`,
    skill,
    type: "choice",
    prompt: difficulty === "advanced" ? "What is the passage mainly about?" : `What is this story mainly about?`,
    answer: lesson.topic,
    options: fillOptions(lesson.topic, unique([lesson.topic, ...appLessons.map((item) => item.topic)]))
  };
  const sequenceQuestion: ChoiceQuestion = {
    id: `${lesson.id}-generated-read-sequence`,
    skill,
    type: "choice",
    prompt: "Which sentence happens first in the story?",
    answer: sentences[0] || exampleWord.example,
    options: fillOptions(sentences[0] || exampleWord.example, sentences)
  };
  const inferenceQuestion: ChoiceQuestion = {
    id: `${lesson.id}-generated-read-inference`,
    skill,
    type: "choice",
    prompt: "What can we learn from the story?",
    answer: `It is about ${lesson.topic.toLowerCase()}.`,
    options: fillOptions(`It is about ${lesson.topic.toLowerCase()}.`, [
      `It is about ${lesson.topic.toLowerCase()}.`,
      "It is only about lunch.",
      "It says school is closed.",
      "It says nobody helps."
    ])
  };
  const grammarQuestion: ChoiceQuestion = {
    id: `${lesson.id}-generated-read-grammar`,
    skill,
    type: "choice",
    prompt: `Choose the correct sentence.`,
    answer: `${firstWord.word} is important.`,
    options: [
      `${firstWord.word} is important.`,
      `${firstWord.word} are important.`,
      `${firstWord.word} am important.`,
      `${firstWord.word} be important.`
    ]
  };
  if (difficulty === "beginner") return [...wordMeaningQuestions, sentenceQuestion, storyQuestion].slice(0, 5);
  if (difficulty === "intermediate") return [...wordMeaningQuestions, sequenceQuestion, sentenceQuestion, storyQuestion].slice(0, 5);
  return [storyQuestion, sequenceQuestion, inferenceQuestion, grammarQuestion, ...wordMeaningQuestions].slice(0, 5);
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function fillOptions(answer: string, pool: string[]) {
  const base = unique([answer, ...pool.filter((item) => item !== answer)]);
  const fallback = ["cat", "book", "happy", "jump"];
  return unique([...base, ...fallback]).slice(0, 4);
}

function shuffleQuestionOptions(options: string[], answer: string, seed: string) {
  const padded = fillOptions(answer, unique([answer, ...options]));
  return padded
    .map((option, index) => ({ option, score: seededScore(`${seed}-${option}-${index}`) }))
    .sort((a, b) => a.score - b.score)
    .map((item) => item.option);
}

function seededScore(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 1000003;
  }
  return hash;
}

function StudentLogin({ onEnter }: { onEnter: (student: StudentSession) => Promise<void> }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(avatars[0]);
  const [proficiencyLevel, setProficiencyLevel] = useState<LearningLevel>("beginner");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const supabaseReady = isSupabaseReady();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!supabaseReady) {
      setError("還沒連接 Supabase。請先在 Vercel 設定 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。");
      return;
    }
    if (username.trim().length < 3) {
      setError("學生帳號至少 3 個字，例如 s001。");
      return;
    }
    if (password.length < 6) {
      setError("密碼至少 6 個字。");
      return;
    }
    if (mode === "register" && !name.trim()) {
      setError("註冊時需要輸入學生姓名。");
      return;
    }

    setBusy(true);
    const result = mode === "register"
      ? await signUpStudent({ username, password, name, avatar, proficiencyLevel })
      : await signInStudent(username, password);
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }
    await onEnter(result.session);
  }

  function localDemoLogin(studentName: string, code: string, studentAvatar: string) {
    onEnter({
      id: code.toLowerCase(),
      name: studentName,
      code,
      avatar: studentAvatar,
      proficiencyLevel: "beginner",
      loginAt: new Date().toISOString(),
      mode: "local"
    });
  }

  return (
    <main className="login-page student-login-page">
      <section className="login-card student-login-card">
        <p className="eyebrow">Student Account</p>
        <h2>{mode === "login" ? "學生登入" : "學生註冊"}</h2>
        <p className="muted">
          學生用帳號和密碼登入後，進度會根據帳號保存。換裝置登入同一個帳號，也能讀取雲端進度。
        </p>

        {!supabaseReady && (
          <div className="notice-box">
            <strong>Supabase 尚未連接</strong>
            <p>目前可以先用示範登入。要啟用正式帳號，請先建立 Supabase 專案並設定 Vercel 環境變數。</p>
          </div>
        )}

        <form className="form" onSubmit={submit}>
          {mode === "register" && (
            <div className="field">
              <label>學生姓名</label>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：Amy" />
            </div>
          )}
          <div className="field">
            <label>學生帳號</label>
            <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="例如：s001" />
          </div>
          <div className="field">
            <label>密碼</label>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 個字" />
          </div>
          {mode === "register" && (
            <div className="field">
              <label>選擇學習徽章</label>
              <div className="avatar-grid">
                {avatars.map((item) => (
                  <button type="button" className={avatar === item ? "avatar-choice active" : "avatar-choice"} key={item} onClick={() => setAvatar(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mode === "register" && (
            <div className="field">
              <label>選擇學習程度</label>
              <div className="level-choice-grid">
                {(["beginner", "intermediate", "advanced"] as LearningLevel[]).map((level) => (
                  <button
                    type="button"
                    className={proficiencyLevel === level ? "level-choice active" : "level-choice"}
                    key={level}
                    onClick={() => setProficiencyLevel(level)}
                  >
                    <strong>{learningLevelLabels[level]}</strong>
                    <small>{learningLevelDescriptions[level]}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <p className="form-error">{error}</p>}
          <button className="btn primary full" type="submit" disabled={busy}>
            <UserRound size={18} /> {busy ? "處理中..." : mode === "login" ? "登入學習" : "建立學生帳號"}
          </button>
        </form>

        <div className="demo-login">
          <button className="btn secondary full" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "還沒有帳號？註冊學生帳號" : "已有帳號？回到登入"}
          </button>
          <p className="muted">示範登入只保存於本機瀏覽器，教師後台看不到。正式測試請使用上方學生帳號登入。</p>
          <div className="btns">
            <button className="btn secondary" onClick={() => localDemoLogin("Amy", "S001", "⭐")}>Amy S001</button>
            <button className="btn secondary" onClick={() => localDemoLogin("Ben", "S002", "🚀")}>Ben S002</button>
          </div>
        </div>
      </section>
    </main>
  );
}

function titleFor(screen: Screen) {
  const titles: Record<Screen, string> = {
    home: "今日故事任務",
    map: "課程地圖",
    story: "故事頁",
    questVocab: "故事單字任務",
    vocab: "單字學習",
    listen: "聽力任務",
    speak: "口說任務",
    read: "閱讀任務",
    write: "寫作任務",
    dialogue: "情境對話",
    review: "再挑戰",
    progress: "學習進度"
  };
  return titles[screen];
}

function taskName(skill: Skill) {
  return { listen: "Listen 聽力", speak: "Speak 口說", read: "Read 閱讀", write: "Write 寫作" }[skill];
}

function Story({ lesson, showZh, setShowZh, speed, setSpeed, speak, next }: {
  lesson: Lesson;
  showZh: boolean;
  setShowZh: (value: boolean) => void;
  speed: number;
  setSpeed: (value: number) => void;
  speak: (text: string, rate?: number) => void;
  next: () => void;
}) {
  const difficulty = lessonDifficulty(lesson);
  const storyText = lesson.sentences.map((line) => line.en).join(" ");
  const zhText = lesson.sentences.map((line) => line.zh).filter(Boolean).join("");
  return (
    <section className="grid two">
      <article className="panel">
        <div className="section-title">
          <h3>{lesson.cover} {lesson.title}</h3>
          <span className="pill">{learningLevelLabels[difficulty]} · {lesson.topic}</span>
        </div>
        {difficulty !== "beginner" && (
          <div className="story-reading-card">
            <p className="eyebrow">{difficulty === "advanced" ? "Reading Passage" : "Mini Story"}</p>
            <h3>{storyText}</h3>
            {showZh && <p className="muted">{zhText}</p>}
            <button className="btn secondary" onClick={() => speak(storyText)}>
              播放完整{difficulty === "advanced" ? "短文" : "故事"}
            </button>
          </div>
        )}
        {lesson.sentences.map((line, index) => (
          <div className="story-line" key={line.en}>
            <div className="pic">{line.image}</div>
            <div>
              <strong>{index + 1}. {line.en}</strong>
              {showZh && <p className="muted">{line.zh}</p>}
            </div>
            <button className="btn secondary" onClick={() => speak(line.en)}>播放</button>
          </div>
        ))}
        <button className="btn primary full" onClick={next}>下一步：學單字</button>
      </article>
      <aside className="panel">
        <h3>故事設定</h3>
        <p className="muted">可以先聽故事，再切換英中對照。</p>
        <div className="btns">
          <button className="btn secondary" onClick={() => setShowZh(!showZh)}>{showZh ? "只看英文" : "英中對照"}</button>
          <button className="btn secondary" onClick={() => setSpeed(speed === 0.65 ? 0.9 : 0.65)}>{speed === 0.65 ? "正常語速" : "慢速播放"}</button>
        </div>
      </aside>
    </section>
  );
}

const wordPhotoTerms: Record<string, string> = {
  zoo: "zoo animals",
  lion: "lion animal",
  monkey: "monkey animal",
  big: "big object",
  funny: "funny child",
  jump: "child jumping",
  apple: "apple fruit",
  bread: "bread food",
  milk: "milk glass",
  rice: "rice bowl",
  lunch: "lunch box",
  table: "table classroom",
  classroom: "classroom",
  teacher: "teacher classroom",
  book: "children book",
  pencil: "pencil",
  write: "child writing",
  family: "family",
  mom: "mother cooking",
  dad: "father reading",
  grandma: "grandmother",
  happy: "happy child",
  sad: "sad child",
  angry: "angry child",
  scared: "scared child",
  friend: "children friends",
  share: "children sharing",
  clean: "cleaning room",
  help: "helping friend",
  helpful: "helping friend",
  difficult: "puzzle challenge",
  carry: "carrying books",
  problem: "thinking child",
  together: "teamwork children",
  kind: "kind child",
  solve: "solving puzzle",
  science: "science fair",
  water: "saving water",
  library: "library books",
  garden: "garden plants",
  stage: "school stage",
  talent: "talent show",
  practice: "student practicing",
  nervous: "nervous student",
  plan: "student planning",
  project: "school project",
  bag: "school bag",
  smile: "child smiling",
  rain: "rainy day",
  birthday: "birthday party",
  color: "color pencils",
  body: "children exercise"
};

function wordPhotoUrl(word: Word, lesson: Lesson) {
  if (word.imageUrl) return word.imageUrl;
  const key = word.word.toLowerCase();
  const term = wordPhotoTerms[key] || `${word.word} ${lesson.topic} english learning`;
  return `https://source.unsplash.com/960x640/?${encodeURIComponent(term)}`;
}

function WordPhoto({ word, lesson }: { word: Word; lesson: Lesson }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="word-photo-frame word-photo-fallback">
        <span>{word.image}</span>
        <strong>{word.word}</strong>
      </div>
    );
  }
  return (
    <div className="word-photo-frame">
      <img src={wordPhotoUrl(word, lesson)} alt={`${word.word} - ${word.meaning}`} onError={() => setFailed(true)} />
    </div>
  );
}

function Vocabulary({ lesson, learnedWords, speak, questMode = false, next, onMark }: {
  lesson: Lesson;
  learnedWords: (Word & { lessonTitle: string; lessonId: string })[];
  speak: (text: string) => void;
  questMode?: boolean;
  next?: () => void;
  onMark?: (word: string, known: boolean) => void;
}) {
  const [marked, setMarked] = useState<Record<string, "known" | "review">>({});
  const [heard, setHeard] = useState<Record<string, boolean>>({});
  const [showWordBank, setShowWordBank] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const currentWord = lesson.words[wordIndex] || lesson.words[0];
  const allReady = lesson.words.length > 0 && lesson.words.every((item) => heard[item.word] && marked[item.word]);
  const currentReady = currentWord ? Boolean(heard[currentWord.word] && marked[currentWord.word]) : false;
  const canGoNextWord = !questMode || currentReady || wordIndex < lesson.words.length - 1 && Boolean(marked[lesson.words[wordIndex + 1]?.word]);

  function mark(word: string, value: "known" | "review") {
    if (!heard[word]) return;
    setMarked((current) => ({ ...current, [word]: value }));
    onMark?.(word, value === "known");
  }

  function moveWord(direction: -1 | 1) {
    setWordIndex((current) => Math.min(Math.max(current + direction, 0), lesson.words.length - 1));
  }

  return (
    <section>
      <div className="section-title">
        <div>
          <h3>{lesson.cover} {lesson.title} {questMode ? "單字任務" : "正在學習的單字"}</h3>
          <p className="muted">
            {questMode
              ? "這是故事冒險中的單字任務。請先聽發音，再選「我會了」或「需要複習」，完成後繼續聽說讀寫。"
              : "這裡只用來查看目前正在學習單元的單字，不會推進或重置故事冒險進度。"}
          </p>
        </div>
        <div className="admin-actions">
          <span className={allReady ? "pill" : "pill blue"}>{allReady ? "本單元單字已完成" : "正在學習中"}</span>
          <button className="btn secondary" type="button" onClick={() => setShowWordBank((value) => !value)}>
            打開單詞收藏冊
          </button>
        </div>
      </div>

      {currentWord && (
        <article className="single-word-card">
          <div className="word-photo-panel">
            <WordPhoto word={currentWord} lesson={lesson} />
            <div className="word-progress-strip">
              {lesson.words.map((item, index) => (
                <button
                  type="button"
                  className={`word-dot ${index === wordIndex ? "active" : ""} ${marked[item.word] ? "done" : ""}`}
                  key={item.word}
                  onClick={() => setWordIndex(index)}
                  aria-label={`前往單字 ${index + 1}`}
                />
              ))}
            </div>
          </div>
          <div className="word-study-panel">
            <div className="word-study-top">
              <span className="pill">{currentWord.level}</span>
              <span className="pill blue">{wordIndex + 1} / {lesson.words.length}</span>
            </div>
            <h2>{currentWord.word}</h2>
            <p className="word-meaning">{currentWord.meaning} · {currentWord.part}</p>
            <div className="example-box">
              <strong>{currentWord.example}</strong>
              <span>{currentWord.translation}</span>
            </div>
            {!heard[currentWord.word] && <p className="muted">先按「發音」，聽清楚後再判斷是否學會。</p>}
            {marked[currentWord.word] === "known" && <p className="success-text">已記錄：我會了，獲得 1 顆星。</p>}
            {marked[currentWord.word] === "review" && <p className="form-error">已加入再挑戰，之後可以複習。</p>}
            <div className="btns word-actions single-word-actions">
              <button className="btn secondary" onClick={() => { speak(currentWord.word); setHeard((current) => ({ ...current, [currentWord.word]: true })); }}>發音</button>
              <button className="btn ghost" disabled={!heard[currentWord.word]} onClick={() => mark(currentWord.word, "known")}>我會了</button>
              <button className="btn ghost" disabled={!heard[currentWord.word]} onClick={() => mark(currentWord.word, "review")}>需要複習</button>
            </div>
            <div className="word-pager">
              <button className="btn secondary" disabled={wordIndex === 0} onClick={() => moveWord(-1)}>上一個單字</button>
              <button className="btn primary" disabled={wordIndex >= lesson.words.length - 1 || !canGoNextWord} onClick={() => moveWord(1)}>下一個單字</button>
            </div>
          </div>
        </article>
      )}

      {questMode && next && (
        <article className="panel vocab-next-panel">
          <div>
            <span className={allReady ? "pill" : "pill blue"}>{allReady ? "單字任務完成" : "先完成本課單字"}</span>
            <h3>下一站：聽力任務</h3>
            <p className="muted">完成本單元所有單字後，就可以聽 Owl 老師出題，繼續這一關的冒險。</p>
          </div>
          <button className="btn primary adventure-btn" disabled={!allReady} type="button" onClick={next}>
            開始聽力任務
          </button>
        </article>
      )}

      {showWordBank && (
        <div className="word-bank-backdrop" role="dialog" aria-modal="true" aria-label="我的單詞收藏冊" onClick={() => setShowWordBank(false)}>
          <article className="word-bank-page" onClick={(event) => event.stopPropagation()}>
            <div className="section-title">
              <div>
                <p className="eyebrow">Word Collection</p>
                <h3>我的單詞收藏冊</h3>
                <p className="muted">只顯示你之前做過的單元單字，還沒學過的單元不會出現在這裡。</p>
              </div>
              <div className="admin-actions">
                <span className="pill blue">{learnedWords.length} 個已學單字</span>
                <button className="btn secondary" type="button" onClick={() => setShowWordBank(false)}>收起收藏冊</button>
              </div>
            </div>
            {learnedWords.length > 0 ? (
              <div className="word-bank">
                {learnedWords.map((item) => (
                  <button className="word-chip" key={`${item.lessonId}-${item.word}`} onClick={() => speak(item.word)}>
                    <span>{item.image}</span>
                    <strong>{item.word}</strong>
                    <small>{item.meaning} · {item.lessonTitle}</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>單詞收藏冊還是空的</strong>
                <p className="muted">完成一些單元後，之前學過的單字會出現在這裡。</p>
              </div>
            )}
          </article>
        </div>
      )}
    </section>
  );
}

function QuizTask({ lesson, skill, questions, speak, state, onStateChange, sectionCompleted = false, helpUsed, onHelp, onAnswer, onPrevSection, onNextSection, onDone }: {
  lesson: Lesson;
  skill: Skill;
  questions: ChoiceQuestion[];
  speak: (text: string, rate?: number) => void;
  state: QuizTaskState;
  onStateChange: (state: QuizTaskState) => void;
  sectionCompleted?: boolean;
  helpUsed: boolean;
  onHelp: (question: ChoiceQuestion) => void;
  onAnswer: (question: ChoiceQuestion, answer: string) => boolean;
  onPrevSection?: () => void;
  onNextSection?: () => void;
  onDone: () => void;
}) {
  const pickedById = state.pickedById || {};
  const feedbackById = state.feedbackById || {};
  const { index } = state;
  const question = questions[index];
  const picked = question ? (pickedById[question.id] || state.picked || "") : "";
  const feedback = question ? (feedbackById[question.id] || state.feedback || "") : "";
  const answeredCount = questions.filter((item) => pickedById[item.id]).length;
  const allAnswered = sectionCompleted || (questions.length > 0 && answeredCount >= questions.length);
  const canMoveNextQuestion = sectionCompleted || Boolean(picked);
  const displayedOptions = useMemo(
    () => question ? shuffleQuestionOptions(question.options, question.answer, question.id) : [],
    [question]
  );
  const setTaskState = (patch: Partial<QuizTaskState>) => onStateChange({ ...state, ...patch });

  if (!question) {
    return (
      <section className="grid two">
        <article className="panel">
          <h3>{taskName(skill)} 內容準備中</h3>
          <p className="muted">這一課的{taskName(skill)}題目還沒有建立。學生可以先完成故事和單字，正式版建議補齊每課 5 題以上。</p>
          <button className="btn primary" onClick={onDone}>跳過這個任務</button>
        </article>
        <aside className="panel">
          <h3>內容提醒</h3>
          <p className="muted">為了避免學生卡住，沒有題目的任務會顯示清楚提示，而不是空白或壞掉。</p>
        </aside>
      </section>
    );
  }

  function choose(answer: string) {
    if (picked) return;
    const nextFeedback = onAnswer(question, answer) ? "答對了！你得到 1 顆星。" : `再試一次也沒關係，正確答案是 ${question.answer}。`;
    setTaskState({
      picked: answer,
      feedback: nextFeedback,
      pickedById: { ...pickedById, [question.id]: answer },
      feedbackById: { ...feedbackById, [question.id]: nextFeedback }
    });
  }

  function next() {
    if (index >= questions.length - 1) {
      if (allAnswered) onDone();
    }
    else {
      const nextQuestion = questions[index + 1];
      if (!sectionCompleted && !picked) return;
      onStateChange({
        ...state,
        index: index + 1,
        picked: nextQuestion ? pickedById[nextQuestion.id] || "" : "",
        feedback: nextQuestion ? feedbackById[nextQuestion.id] || "" : ""
      });
    }
  }

  function previousQuestion() {
    if (index <= 0) return;
    const previous = questions[index - 1];
    onStateChange({
      ...state,
      index: index - 1,
      picked: previous ? pickedById[previous.id] || "" : "",
      feedback: previous ? feedbackById[previous.id] || "" : ""
    });
  }

  return (
    <section className="grid two">
      <article className="panel">
        <div className="section-title">
          <h3>{taskName(skill)} · {index + 1}/{questions.length}</h3>
          <div className="admin-actions">
            {onPrevSection && <button className="btn ghost" type="button" onClick={onPrevSection}>上一部分</button>}
            <span className="pill">{lesson.title}</span>
            <button className="btn owl-help-btn" type="button" disabled={helpUsed || Boolean(picked)} onClick={() => onHelp(question)}>
              {helpUsed ? "已用求助" : "Owl 求助"}
            </button>
          </div>
        </div>
        <div className="task-card">
          <p className="eyebrow">Question</p>
          <h3>{question.prompt}</h3>
          {question.audio && (
            <div className="btns listening-controls">
              <button className="btn secondary" onClick={() => speak(question.audio || question.prompt, 0.9)}>
                <Headphones size={18} /> 正常播放
              </button>
              <button className="btn ghost" onClick={() => speak(question.audio || question.prompt, 0.62)}>
                慢速播放
              </button>
            </div>
          )}
          <div className="options">
            {displayedOptions.map((option) => (
              <button
                key={option}
                className={`option ${picked && option === question.answer ? "correct" : ""} ${picked === option && option !== question.answer ? "wrong" : ""}`}
                onClick={() => choose(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="feedback">{feedback}</div>
          <div className="btns task-nav-actions">
            <button className="btn ghost" type="button" disabled={index <= 0} onClick={previousQuestion}>上一題</button>
            <button className="btn primary" type="button" disabled={!canMoveNextQuestion || (index >= questions.length - 1 && !allAnswered)} onClick={next}>
              {index >= questions.length - 1 ? "完成任務" : "下一題"}
            </button>
            {onNextSection && <button className="btn secondary" type="button" disabled={!allAnswered} onClick={onNextSection}>下一部分</button>}
          </div>
        </div>
      </article>
      <aside className="panel">
        <h3>任務小提醒</h3>
        <p className="muted">答錯會進入「再挑戰」，之後可以按技能分類複習。</p>
      </aside>
    </section>
  );
}

function SpeakTask({ lesson, speak, state, onStateChange, sectionCompleted = false, helpUsed, onHelp, onAnswer, onPrevSection, onNextSection, onDone }: {
  lesson: Lesson;
  speak: (text: string, rate?: number) => void;
  state: SpeakTaskState;
  onStateChange: (state: SpeakTaskState) => void;
  sectionCompleted?: boolean;
  helpUsed: boolean;
  onHelp: (answer: string) => void;
  onAnswer: (skill: Skill, label: string, correct: boolean, answer: string, correctAnswer: string) => void;
  onPrevSection?: () => void;
  onNextSection?: () => void;
  onDone: () => void;
}) {
  const { done, heard, tries, transcripts = {}, scores = {}, feedback = {} } = state;
  const safeIndex = Math.min(state.index || 0, Math.max(lesson.speak.length - 1, 0));
  const task = lesson.speak[safeIndex];
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState("");
  const [confirmFinish, setConfirmFinish] = useState(false);
  const recordingStopRef = useRef<(() => void) | null>(null);
  const allDone = sectionCompleted || lesson.speak.every((item) => done[item.id]);
  const lowScoreTasks = lesson.speak.filter((item) => done[item.id] && (scores[item.id] ?? 100) < 70);
  const nextTask = lesson.speak.find((item) => !done[item.id]) || task || lesson.speak[0];
  const setTaskState = (patch: Partial<SpeakTaskState>) => onStateChange({ ...state, ...patch });
  const speechSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    return () => {
      recordingStopRef.current?.();
      recordingStopRef.current = null;
    };
  }, []);

  function finishPronunciationCheck(task: { id: string; prompt: string; target: string }, transcript: string) {
    const score = scorePronunciation(task.target, transcript);
    const passed = score >= 70;
    const nextTries = (tries[task.id] || 0) + 1;
    const nextFeedback = buildSpeechFeedback(task.target, transcript, score);
    setTaskState({
      index: safeIndex,
      heard,
      tries: { ...tries, [task.id]: nextTries },
      transcripts: { ...transcripts, [task.id]: transcript },
      scores: { ...scores, [task.id]: score },
      feedback: { ...feedback, [task.id]: nextFeedback },
      done: { ...done, [task.id]: true }
    });
    onAnswer("speak", `${task.prompt}：${task.target}`, passed, transcript || "未辨識到聲音", task.target);
  }

  function checkPronunciation(task: { id: string; prompt: string; target: string }) {
    if (recordingId === task.id) {
      recordingStopRef.current?.();
      return;
    }
    if (!heard[task.id]) {
      setSpeechError("請先聽一次範例，再開始朗讀。");
      return;
    }
    if (!speechSupported) {
      setSpeechError("這個瀏覽器暫時不支援語音辨識。請用 Chrome 或 Edge 測試口說任務。");
      return;
    }
    setSpeechError("");
    setRecordingId(task.id);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    recordingStopRef.current = startStudentSpeechSession({
      timeoutMs: 12000,
      onResult: (transcript) => {
        finishPronunciationCheck(task, transcript);
        setRecordingId(null);
        recordingStopRef.current = null;
      },
      onError: (error) => {
        setSpeechError(error.message);
        setRecordingId(null);
        recordingStopRef.current = null;
      }
    });
  }

  function previousTask() {
    if (safeIndex <= 0) return;
    setTaskState({ index: safeIndex - 1 });
  }

  function nextSpeakTask() {
    if (!task || (!sectionCompleted && !done[task.id]) || safeIndex >= lesson.speak.length - 1) return;
    setTaskState({ index: safeIndex + 1 });
  }

  function finishSpeaking() {
    if (!allDone) return;
    if (lowScoreTasks.length && !confirmFinish) {
      setConfirmFinish(true);
      return;
    }
    onDone();
  }

  if (!lesson.speak.length) {
    return (
      <section className="grid two">
        <article className="panel">
          <h3>Speak 口說內容準備中</h3>
          <p className="muted">這一課還沒有口說任務。正式版建議每課加入 3 個跟讀任務和 1 個看圖說句子。</p>
          <button className="btn primary" onClick={onDone}>跳過口說任務</button>
        </article>
      </section>
    );
  }
  return (
    <section className="grid two">
      <article className="panel">
        <div className="section-title">
          <h3>Speak 口說任務</h3>
          <div className="admin-actions">
            {onPrevSection && <button className="btn ghost" type="button" onClick={onPrevSection}>上一部分</button>}
            <span className="pill">AI 發音檢查</span>
            <button className="btn owl-help-btn" type="button" disabled={helpUsed || !nextTask} onClick={() => nextTask && onHelp(nextTask.target)}>
              {helpUsed ? "已用求助" : "Owl 求助"}
            </button>
          </div>
        </div>
        {task && (
          <div className="task-card speak-ai-card" key={task.id}>
            <div className="review-head">
              {lesson.speak.map((item, index) => (
                <button
                  className={index === safeIndex ? "pill blue" : done[item.id] ? "pill" : "pill muted-pill"}
                  key={item.id}
                  type="button"
                  disabled={!sectionCompleted && index > safeIndex && !done[item.id]}
                  onClick={() => sectionCompleted || index <= safeIndex || done[item.id] ? setTaskState({ index }) : undefined}
                >
                  {done[item.id] ? "✓" : index + 1}
                </button>
              ))}
            </div>
            <p className="eyebrow">{task.prompt}</p>
            <h3>{task.target}</h3>
            <p className="muted">先聽範例，再按「開始朗讀」。AI 會聽你讀出的英文，分數未滿 70 也可以完成，但會自動加入「再挑戰」。</p>
            <div className="speak-score-card">
              <div className={`speak-score-ring ${done[task.id] ? "passed" : scores[task.id] ? "trying" : ""}`}>
                <strong>{scores[task.id] ?? "--"}</strong>
                <small>分</small>
              </div>
              <div>
                <strong>{done[task.id] ? (scores[task.id] >= 70 ? "發音通過" : "已完成，建議再練") : scores[task.id] ? "再調整一下" : "等待朗讀"}</strong>
                <p>{feedback[task.id] || "Owl 老師會聽你的朗讀，然後告訴你要加強哪裡。"}</p>
              </div>
            </div>
            {transcripts[task.id] && (
              <div className="speech-transcript">
                <span>AI 聽到：</span>
                <strong>{transcripts[task.id]}</strong>
              </div>
            )}
            <div className="btns">
              <button className="btn secondary" onClick={() => {
                speak(task.target, 0.78);
                setTaskState({
                  index: safeIndex,
                  heard: { ...heard, [task.id]: true },
                  tries
                });
              }}><Headphones size={18} /> 聽範例</button>
              <button className="btn primary speak-record-btn" disabled={!heard[task.id] || Boolean(recordingId && recordingId !== task.id)} onClick={() => checkPronunciation(task)}>
                <Mic size={18} /> {recordingId === task.id ? "結束朗讀" : done[task.id] ? "再讀一次" : "開始朗讀"}
              </button>
            </div>
            <div className="btns task-nav-actions">
              <button className="btn ghost" type="button" disabled={safeIndex <= 0} onClick={previousTask}>上一題</button>
              <button className="btn primary" type="button" disabled={(!sectionCompleted && !done[task.id]) || safeIndex >= lesson.speak.length - 1} onClick={nextSpeakTask}>下一題</button>
              {onNextSection && <button className="btn secondary" type="button" disabled={!allDone} onClick={onNextSection}>下一部分</button>}
            </div>
          </div>
        )}
        {speechError && <div className="feedback wrong-feedback">{speechError}</div>}
        {confirmFinish && (
          <div className="notice-box">
            <strong>確認完成口說任務？</strong>
            <p>你有 {lowScoreTasks.length} 題低於 70 分，完成後會進入「再挑戰」讓你之後重練。</p>
            <div className="btns">
              <button className="btn primary" type="button" onClick={finishSpeaking}>確認完成</button>
              <button className="btn ghost" type="button" onClick={() => setConfirmFinish(false)}>我再練一下</button>
            </div>
          </div>
        )}
        <button className="btn primary full" disabled={!allDone} onClick={finishSpeaking}>完成口說任務</button>
      </article>
      <aside className="panel speak-coach-panel">
        <h3>Owl 口說教室</h3>
        <p className="muted">讀的時候靠近麥克風，慢慢說完整句子。低於 70 分不會卡住你，但會放進再挑戰。</p>
        <div className="speak-tip-list">
          <span>1. 先聽範例</span>
          <span>2. 再自己朗讀</span>
          <span>3. 看 AI 回饋修正</span>
        </div>
      </aside>
    </section>
  );
}

function startStudentSpeechSession({
  timeoutMs = 12000,
  onResult,
  onError
}: {
  timeoutMs?: number;
  onResult: (transcript: string) => void;
  onError: (error: Error) => void;
}) {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError(new Error("這個瀏覽器不支援語音辨識。"));
    return () => undefined;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = true;
  let settled = false;
  let bestTranscript = "";

  function finishWithTranscript() {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeout);
    recognition.stop();
    if (bestTranscript.trim()) onResult(bestTranscript.trim());
    else onError(new Error("沒有聽到清楚的英文。請靠近麥克風，再慢慢讀一次。"));
  }

  const timeout = window.setTimeout(finishWithTranscript, timeoutMs);

  recognition.onresult = (event: any) => {
    let transcript = "";
    for (let index = 0; index < event.results.length; index += 1) {
      transcript += `${event.results[index]?.[0]?.transcript || ""} `;
    }
    bestTranscript = transcript.trim() || bestTranscript;
  };
  recognition.onerror = (event: any) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeout);
    const reason = event.error === "not-allowed"
      ? "瀏覽器沒有麥克風權限，請允許使用麥克風。"
      : "沒有成功聽到聲音，請再讀一次。";
    onError(new Error(reason));
  };
  recognition.onend = () => {
    if (!settled) finishWithTranscript();
  };
  recognition.start();

  return finishWithTranscript;
}

function listenToStudentSpeech(options: { timeoutMs?: number } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    startStudentSpeechSession({
      timeoutMs: options.timeoutMs || 9000,
      onResult: resolve,
      onError: reject
    });
  });
}

function normalizeSpeechText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scorePronunciation(target: string, transcript: string) {
  const targetText = normalizeSpeechText(target);
  const spokenText = normalizeSpeechText(transcript);
  if (!spokenText) return 0;
  const targetWords = targetText.split(" ").filter(Boolean);
  const spokenWords = spokenText.split(" ").filter(Boolean);
  const matchedWords = targetWords.filter((word) => spokenWords.includes(word)).length;
  const wordScore = targetWords.length ? matchedWords / targetWords.length : 0;
  const charScore = similarityScore(targetText, spokenText);
  return Math.round(Math.min(100, (wordScore * 0.58 + charScore * 0.42) * 100));
}

function similarityScore(a: string, b: string) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const distance = levenshteinDistance(a, b);
  return Math.max(0, 1 - distance / Math.max(a.length, b.length));
}

function levenshteinDistance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let last = i - 1;
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const old = previous[j];
      previous[j] = a[i - 1] === b[j - 1]
        ? last
        : Math.min(previous[j - 1], previous[j], last) + 1;
      last = old;
    }
  }
  return previous[b.length];
}

function buildSpeechFeedback(target: string, transcript: string, score: number) {
  const targetWords = normalizeSpeechText(target).split(" ").filter(Boolean);
  const spokenWords = normalizeSpeechText(transcript).split(" ").filter(Boolean);
  const missing = targetWords.filter((word) => !spokenWords.includes(word));
  if (score >= 88) return "很好，發音和咬字都很接近範例。可以再挑戰更自然的語速。";
  if (score >= 70) return missing.length ? `通過了。再注意 ${missing.slice(0, 2).join(", ")} 這些字要讀清楚。` : "通過了。句子大致正確，可以再讀得更流暢。";
  if (missing.length) return `再試一次。AI 沒有清楚聽到 ${missing.slice(0, 3).join(", ")}，請把這些字慢慢讀完整。`;
  return "再試一次。句子聽起來接近，但咬字還不夠清楚，請放慢速度。";
}

function WriteTask({ lesson, state, onStateChange, sectionCompleted = false, helpUsed, onHelp, onAnswer, onPrevSection, onNextSection, onDone }: {
  lesson: Lesson;
  state: WriteTaskState;
  onStateChange: (state: WriteTaskState) => void;
  sectionCompleted?: boolean;
  helpUsed: boolean;
  onHelp: (answer: string) => void;
  onAnswer: (skill: Skill, label: string, correct: boolean, answer: string, correctAnswer: string) => void;
  onPrevSection?: () => void;
  onNextSection?: () => void;
  onDone: () => void;
}) {
  const safeIndex = Math.min(state.index || 0, Math.max(lesson.write.length - 1, 0));
  const { answers, checked, aiTips } = state;
  const task = lesson.write[safeIndex];
  const complete = sectionCompleted || lesson.write.every((item) => checked[item.id]);
  const setTaskState = (patch: Partial<WriteTaskState>) => onStateChange({ ...state, ...patch });
  if (!lesson.write.length) {
    return (
      <section className="grid two">
        <article className="panel">
          <h3>Write 寫作內容準備中</h3>
          <p className="muted">這一課還沒有寫作任務。正式版建議每課加入句型填空和一句自由寫作。</p>
          <button className="btn primary" onClick={onDone}>跳過寫作任務</button>
        </article>
      </section>
    );
  }
  return (
    <section className="grid two">
      <article className="panel">
        <div className="section-title">
          <h3>Write 寫作任務 · {safeIndex + 1}/{lesson.write.length}</h3>
          <div className="admin-actions">
            {onPrevSection && <button className="btn ghost" type="button" onClick={onPrevSection}>上一部分</button>}
            <span className="pill">由簡到難</span>
            <button className="btn owl-help-btn" type="button" disabled={helpUsed || !task || Boolean(checked[task.id])} onClick={() => task && onHelp(task.answerHint.trim())}>
              {helpUsed ? "已用求助" : "Owl 求助"}
            </button>
          </div>
        </div>
        {task && (
          <div className="task-card" key={task.id}>
            <div className="review-head">
              {lesson.write.map((item, index) => (
                <button
                  className={index === safeIndex ? "pill blue" : checked[item.id] ? "pill" : "pill muted-pill"}
                  key={item.id}
                  type="button"
                  onClick={() => setTaskState({ index })}
                >
                  {checked[item.id] ? "⭐" : index + 1}
                </button>
              ))}
            </div>
            <p className="eyebrow">{task.prompt}</p>
            <h3>用英文表達：{writingMeaningHint(task, lesson)}</h3>
            <p className="muted">句型線索：{task.starter.replace("____", "______")}。不用背原文，只要意思合理。</p>
            <div className="writing-meaning-card">
              <strong>先想中文意思</strong>
              <p>{friendlyWritingHint(task, lesson)}</p>
            </div>
            <div className="field">
              <textarea rows={4} placeholder="在這裡寫英文，可以寫完整句子或關鍵答案。提交後會看到正確答案。" value={answers[task.id] || ""} onChange={(event) => setTaskState({ answers: { ...answers, [task.id]: event.target.value } })} />
            </div>
            <div className="btns">
              <button className="btn ghost" onClick={() => {
                setTaskState({ aiTips: { ...aiTips, [task.id]: getSimpleWritingFeedback(answers[task.id] || "", task, lesson) } });
              }}>AI 小提示</button>
              <button className="btn secondary" disabled={!answers[task.id]?.trim() || Boolean(checked[task.id])} onClick={() => {
                const answer = answers[task.id] || "";
                const correctAnswer = task.answerHint.trim();
                const correct = isWritingCorrect(answer, correctAnswer);
                setTaskState({ checked: { ...checked, [task.id]: { correct, correctAnswer } } });
                onAnswer("write", `${task.prompt}：${task.starter}`, correct, answer, correctAnswer);
              }}>提交答案</button>
            </div>
            {aiTips[task.id] && <WritingFeedbackCard feedback={aiTips[task.id]} />}
            {checked[task.id] && (
              <p className={checked[task.id].correct ? "success-text" : "form-error"}>
                {checked[task.id].correct ? "寫得很好！" : `還差一點，正確答案參考：${checked[task.id].correctAnswer}`}
              </p>
            )}
            <div className="btns task-nav-actions">
              <button className="btn ghost" type="button" disabled={safeIndex <= 0} onClick={() => setTaskState({ index: safeIndex - 1 })}>上一題</button>
              {safeIndex < lesson.write.length - 1 ? (
                <button className="btn primary" type="button" disabled={!sectionCompleted && !checked[task.id]} onClick={() => setTaskState({ index: safeIndex + 1 })}>下一題</button>
              ) : (
                <button className="btn primary" type="button" disabled={!complete} onClick={onDone}>完成寫作任務</button>
              )}
              {onNextSection && <button className="btn secondary" type="button" disabled={!complete} onClick={onNextSection}>下一部分</button>}
            </div>
          </div>
        )}
      </article>
      <aside className="panel writing-side-panel">
        <h3>寫作支援</h3>
        <p className="muted">可以按上一頁回到閱讀、口說、聽力、單字和故事，不會清空已寫內容。</p>
        <div className="story-mini-box">
          <strong>本課故事提醒</strong>
          {lesson.sentences.slice(0, 3).map((line) => (
            <p key={line.en}>{line.en}<br /><span>{line.zh}</span></p>
          ))}
        </div>
      </aside>
    </section>
  );
}

function WritingFeedbackCard({ feedback }: { feedback: WritingFeedback }) {
  return (
    <div className={`ai-feedback ${feedback.mood}`}>
      <div>
        <span className="ai-badge">AI</span>
        <strong>{feedback.title}</strong>
      </div>
      <ul>
        {feedback.notes.map((note) => <li key={note}>{note}</li>)}
      </ul>
      <p>{feedback.nextStep}</p>
    </div>
  );
}

function getSimpleWritingFeedback(answer: string, task: WritingTask, lesson: Lesson): WritingFeedback {
  const clean = answer.trim();
  const lower = clean.toLowerCase();
  const words = clean.match(/[a-zA-Z]+/g) || [];
  const likelyAnswers = task.answerHint.split("/").map((item) => item.trim()).filter(Boolean);
  const likelyMeanings = likelyAnswers
    .map((answer) => lesson.words.find((word) => word.word.toLowerCase() === answer.toLowerCase())?.meaning)
    .filter(Boolean);
  const notes: string[] = [];

  if (!clean) {
    notes.push(`這句中文大概是：${writingMeaningHint(task, lesson)}`);
    notes.push(likelyMeanings.length ? `答案的中文意思接近：「${likelyMeanings.join(" / ")}」。` : "先想想空格要表達的人、物品、動作或感覺。");
  } else if (words.length >= 3) {
    notes.push("你已經寫出英文了。現在檢查它是否符合這句中文意思。");
  } else {
    notes.push("可以先寫短一點，不需要背原文，只要意思合理。");
  }

  const hasLikelyAnswer = task.answerHint
    .split("/")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .some((item) => lower.includes(item));

  return {
    mood: hasLikelyAnswer ? "great" : words.length >= 3 ? "good" : "try",
    title: hasLikelyAnswer ? "很接近正確答案。" : words.length >= 3 ? "方向可以，再對照中文意思。" : "先看中文意思再寫英文。",
    notes,
    nextStep: hasLikelyAnswer
      ? "現在可以按「提交答案」看看結果。"
      : likelyMeanings.length
        ? `關鍵意思是「${likelyMeanings.join(" / ")}」，請用英文表達。`
        : `再看一次句意：「${writingMeaningHint(task, lesson)}」`
  };
}

function friendlyWritingHint(task: { starter: string; answerHint: string }, lesson: Lesson) {
  const relatedWords = task.answerHint
    .split("/")
    .map((item) => item.trim().toLowerCase())
    .map((answer) => lesson.words.find((word) => word.word.toLowerCase() === answer))
    .filter(Boolean) as Word[];
  if (relatedWords.length) {
    return `答案意思接近「${relatedWords.map((word) => word.meaning).join(" / ")}」。請用英文寫出這個意思，不需要和故事原句完全一樣。`;
  }
  return `先看中文意思：「${writingMeaningHint(task, lesson)}」。再用英文寫出合理答案。`;
}

function writingMeaningHint(task: { starter: string; answerHint: string }, lesson: Lesson) {
  const relatedWords = task.answerHint
    .split("/")
    .map((item) => item.trim().toLowerCase())
    .map((answer) => lesson.words.find((word) => word.word.toLowerCase() === answer))
    .filter(Boolean) as Word[];
  const answerMeaning = relatedWords.map((word) => word.meaning).join(" / ");
  const sentence = task.starter.replace("____", answerMeaning || "這個意思");
  return sentence || answerMeaning || "把空格的中文意思想清楚，再寫英文。";
}

function ScenarioDialogue({
  scenarios,
  activeScenario,
  setActiveScenario,
  messages,
  setMessages,
  exitOpen,
  setExitOpen,
  studentId,
  speak,
  assignedScenarioIds,
  onCompleteScenarioAssignment
}: {
  scenarios: DialogueScenario[];
  activeScenario: DialogueScenario | null;
  setActiveScenario: (scenario: DialogueScenario | null) => void;
  messages: DialogueMessage[];
  setMessages: (messages: DialogueMessage[]) => void;
  exitOpen: boolean;
  setExitOpen: (open: boolean) => void;
  studentId: string;
  speak: (text: string, rate?: number, voiceHint?: "male" | "female") => void;
  assignedScenarioIds: Set<string>;
  onCompleteScenarioAssignment: (scenarioId: string) => void;
}) {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [aiMode, setAiMode] = useState<"unknown" | "ai" | "simple">("unknown");
  const [error, setError] = useState("");
  const [aiError, setAiError] = useState("");

  function startScenario(scenario: DialogueScenario) {
    setActiveScenario(scenario);
    const firstMessage = { role: "ai" as const, text: scenario.opening };
    setMessages([firstMessage]);
    window.setTimeout(() => speak(scenario.opening, 0.88, scenario.voice), 120);
  }

  async function sendStudentMessage(text: string) {
    if (!activeScenario || !text.trim()) return;
    const studentMessage = { role: "student" as const, text: text.trim() };
    const conversation = [...messages, studentMessage];
    setMessages(conversation);
    setInput("");
    setThinking(true);
    const aiResult = await requestDialogueReply(activeScenario, conversation);
    setAiMode(aiResult.mode);
    setAiError(aiResult.error || "");
    const nextMessages = [...conversation, { role: "ai" as const, text: aiResult.reply }];
    setMessages(nextMessages);
    setThinking(false);
    speak(aiResult.reply, 0.88, activeScenario.voice);
  }

  async function useVoiceInput() {
    setError("");
    setListening(true);
    try {
      const transcript = await listenToStudentSpeech();
      await sendStudentMessage(transcript);
    } catch (event) {
      setError(event instanceof Error ? event.message : "沒有成功聽到聲音。");
    } finally {
      setListening(false);
    }
  }

  function saveHistory() {
    if (!activeScenario || !messages.length) return;
    const key = `seq-dialogue-history-${studentId}`;
    const history = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(key, JSON.stringify([
      { id: Date.now(), scenarioId: activeScenario.id, title: activeScenario.title, date: new Date().toISOString(), messages },
      ...history
    ].slice(0, 20)));
    closeScenario();
  }

  function closeScenario() {
    setExitOpen(false);
    setActiveScenario(null);
    setMessages([]);
    setInput("");
    setError("");
    setAiError("");
  }

  if (!activeScenario) {
    return (
      <section className="dialogue-home">
        <div className="section-title">
          <div>
            <h3>AI 情境對話</h3>
            <p className="muted">選一個生活情境，和 AI 角色用英文聊天。可以打字，也可以用語音回答。</p>
          </div>
          <span className="pill blue">獨立練習</span>
        </div>
        <div className="grid cards scenario-grid">
          {scenarios.map((scenario) => (
            <article className="card scenario-card" key={scenario.id}>
              <div className="scenario-cover">{scenario.cover}</div>
              <span className="pill">{assignedScenarioIds.has(scenario.id) ? "老師指定" : learningLevelLabels[scenario.level]}</span>
              <h3>{scenario.title}</h3>
              <p>{scenario.topic} · AI 扮演 {scenario.role}</p>
              <p className="muted">{scenario.goal}</p>
              <button className="btn primary full" type="button" onClick={() => startScenario(scenario)}>開始對話</button>
            </article>
          ))}
        </div>
      </section>
    );
  }

  const isAssignedScenario = assignedScenarioIds.has(activeScenario.id);
  const hasStudentReply = messages.some((message) => message.role === "student");

  return (
    <section className="dialogue-stage">
      <article className="dialogue-panel">
        <div className="dialogue-header">
          <div>
            <span className="dialogue-avatar">{activeScenario.cover}</span>
            <div>
              <p className="eyebrow">{activeScenario.topic}</p>
              <h3>{activeScenario.title}</h3>
              <small>AI role: {activeScenario.role}</small>
            </div>
          </div>
          <span className={`pill ${aiMode === "ai" ? "" : "blue"}`}>
            {aiMode === "ai" ? "真正 AI 模式" : aiMode === "simple" ? "簡易備援模式" : "AI 檢查中"}
          </span>
          <button className="btn ghost" type="button" onClick={() => setExitOpen(true)}>退出</button>
        </div>
        {aiMode === "simple" && aiError && (
          <div className="ai-mode-warning">
            <strong>AI 沒有成功啟動，目前正在使用簡易備援回覆。</strong>
            <span>{aiError}</span>
          </div>
        )}
        {isAssignedScenario && (
          <div className="notice-box dialogue-assignment-banner">
            <div>
              <strong>老師指定情境任務</strong>
              <p>至少回覆 AI 一次後，就可以標記完成。</p>
            </div>
            <button
              className="btn primary"
              type="button"
              disabled={!hasStudentReply}
              onClick={() => onCompleteScenarioAssignment(activeScenario.id)}
            >
              完成情境任務
            </button>
          </div>
        )}
        <div className="dialogue-box">
          {messages.map((message, index) => (
            <div className={`dialogue-message ${message.role}`} key={`${message.role}-${index}`}>
              <span>{message.role === "ai" ? activeScenario.cover : "🧑"}</span>
              <p>{message.text}</p>
            </div>
          ))}
          {thinking && (
            <div className="dialogue-message ai thinking">
              <span>{activeScenario.cover}</span>
              <p>AI 正在想一個自然的回應...</p>
            </div>
          )}
        </div>
        <div className="dialogue-input-row">
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type your English reply..." onKeyDown={(event) => {
            if (event.key === "Enter") void sendStudentMessage(input);
          }} />
          <button className="btn secondary" type="button" disabled={listening || thinking} onClick={useVoiceInput}>
            <Mic size={18} /> {listening ? "Listening..." : "語音"}
          </button>
          <button className="btn primary" type="button" disabled={thinking} onClick={() => void sendStudentMessage(input)}>送出</button>
        </div>
        {error && <p className="form-error">{error}</p>}
      </article>
      {exitOpen && (
        <div className="quest-guard-backdrop" role="dialog" aria-modal="true">
          <article className="quest-guard-card">
            <h3>要退出這次情境對話嗎？</h3>
            <p className="muted">你可以保存成歷史聊天記錄，之後再查看；也可以直接放棄。</p>
            <div className="btns">
              <button className="btn primary" type="button" onClick={saveHistory}>保存並退出</button>
              <button className="btn secondary" type="button" onClick={closeScenario}>不保存退出</button>
              <button className="btn ghost" type="button" onClick={() => setExitOpen(false)}>繼續對話</button>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}

async function requestDialogueReply(scenario: DialogueScenario, messages: DialogueMessage[]) {
  try {
    const response = await fetch("/api/dialogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario: {
          title: scenario.title,
          role: scenario.role,
          level: scenario.level,
          goal: scenario.goal,
          setting: scenario.setting
        },
        messages
      })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      const detail = typeof data?.error === "string" ? data.error : `HTTP ${response.status}`;
      throw new Error(summarizeAiApiError(detail, response.status));
    }
    const data = await response.json();
    if (typeof data.reply === "string" && data.reply.trim()) {
      return { reply: data.reply.trim(), mode: "ai" as const };
    }
  } catch (event) {
    const lastStudentMessage = messages.filter((message) => message.role === "student").at(-1)?.text || "";
    const error = event instanceof Error ? event.message : "無法連接 AI API。";
    return { reply: generateDialogueReply(scenario, lastStudentMessage, messages.length), mode: "simple" as const, error };
  }
  const lastStudentMessage = messages.filter((message) => message.role === "student").at(-1)?.text || "";
  return {
    reply: generateDialogueReply(scenario, lastStudentMessage, messages.length),
    mode: "simple" as const,
    error: "AI 回傳格式沒有 reply，已切回簡易備援。"
  };
}

function summarizeAiApiError(raw: string, status?: number) {
  const text = raw.toLowerCase();
  if (text.includes("openai_api_key is not configured")) return "Vercel 沒有讀到 OPENAI_API_KEY，請確認環境變數已加到 Production 並重新部署。";
  if (status === 401 || text.includes("invalid_api_key") || text.includes("incorrect api key")) return "OpenAI API Key 無效或貼錯，請重新建立 Key 後放到 Vercel。";
  if (status === 429 || text.includes("insufficient_quota") || text.includes("quota")) return "OpenAI 帳號額度不足或付款未啟用，請到 OpenAI Billing 檢查。";
  if (text.includes("model_not_found") || text.includes("does not exist")) return "OPENAI_MODEL 不能使用或模型名稱錯誤，建議先改成 gpt-4.1-mini。";
  if (status === 403) return "OpenAI Key 沒有權限使用目前模型，請檢查模型或帳號權限。";
  if (status) return `AI API 回傳錯誤 HTTP ${status}，請檢查 Vercel 環境變數與 OpenAI 帳號。`;
  return "無法連接 AI API，已切回簡易備援。";
}

function generateDialogueReply(scenario: DialogueScenario, studentText: string, turn: number) {
  const text = studentText.toLowerCase();
  const studentTurn = Math.max(0, Math.floor((turn - 1) / 2));
  if (/\b(bye|goodbye|see you)\b/.test(text)) return "Goodbye. Thank you for practicing English with me.";
  if (/\b(hi|hello|hey)\b/.test(text)) {
    if (scenario.id === "hotel-check-in") return "Hello. Welcome to Star Hotel. Do you have a reservation today?";
    if (scenario.id === "restaurant-order") return "Hello. Welcome. What would you like to eat or drink?";
    if (scenario.id === "school-office") return "Hi. How can I help you at school today?";
    if (scenario.id === "doctor-visit") return "Hello. Please tell me how you feel today.";
    return scenario.opening;
  }
  if (scenario.id === "hotel-check-in") {
    if (text.includes("check in") || text.includes("check-in")) return "Sure. Do you have a reservation, or would you like to book a room now?";
    if (text.includes("reservation") || text.includes("book")) return "Great. May I have your full name, please?";
    if (text.includes("no")) return "No problem. Would you like to book a room now?";
    if (text.includes("name") || text.includes("my name is")) return "Thank you. How many nights will you stay?";
    if (text.includes("night")) return "Thank you. Would you like breakfast included?";
    if (text.includes("yes")) return "Perfect. Here is your room key. Your room is on the third floor.";
  }
  if (scenario.id === "restaurant-order") {
    if (text.includes("water") || text.includes("juice")) return "Sure. What food would you like with your drink?";
    if (text.includes("rice") || text.includes("noodle") || text.includes("burger")) return "Good choice. Would you like anything else?";
    if (text.includes("thank")) return "You are welcome. Your food will be ready soon.";
  }
  if (scenario.id === "school-office") {
    if (text.includes("eat") || text.includes("food") || text.includes("lunch")) return "This is the school office, but I can help. Do you want to go to the cafeteria?";
    if (text.includes("help")) return "Sure. Please tell me what you need help with.";
    if (text.includes("teacher")) return "Which teacher are you looking for?";
    if (text.includes("class")) return "Please write your class and name here.";
    if (text.includes("lost")) return "I can help. What did you lose?";
  }
  if (scenario.id === "doctor-visit") {
    if (text.includes("head") || text.includes("stomach") || text.includes("hurt")) return "I see. When did it start?";
    if (text.includes("today") || text.includes("yesterday")) return "Please drink water and rest. I will check you now.";
    if (text.includes("fever")) return "Let me take your temperature first.";
  }
  return scenario.sampleReplies[studentTurn % scenario.sampleReplies.length] || "Can you tell me more?";
}

function isWritingCorrect(answer: string, correctAnswer: string) {
  const cleanAnswer = answer.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  const possibleAnswers = correctAnswer.split("/").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return possibleAnswers.some((possible) => {
    const cleanCorrect = possible.replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
    return cleanCorrect.every((word) => cleanAnswer.includes(word));
  });
}

function findReviewContext(label: string, lessons: Lesson[]): { word?: Word; question?: ChoiceQuestion; speaking?: SpeakingTask; writing?: WritingTask; lesson?: Lesson } {
  const wordLabel = label.replace(/^單字：/, "");
  for (const lesson of lessons) {
    const word = lesson.words.find((item) => item.word === wordLabel);
    if (word) return { word, lesson };

    const generatedQuestions = [...buildLessonPracticeQuestions(lesson, "listen"), ...buildLessonPracticeQuestions(lesson, "read")];
    const question = [...lesson.listen, ...lesson.read, ...generatedQuestions].find((item) => item.prompt === label);
    if (question) return { question, lesson };

    const speaking = lesson.speak.find((item) => `${item.prompt}：${item.target}` === label || item.target === label);
    if (speaking) return { speaking, lesson };

    const writing = lesson.write.find((item) => `${item.prompt}：${item.starter}` === label);
    if (writing) return { writing, lesson };
  }
  return {};
}

function buildAiReviewExercises(items: { label: string; skill: Skill }[], lessons: Lesson[]) {
  const exercises: { id: string; lessonTitle: string; question: ChoiceQuestion }[] = [];
  const allWords = lessons.flatMap((lesson) => lesson.words);
  const allMeanings = unique(allWords.map((word) => word.meaning).filter(Boolean));
  const allWordTexts = unique(allWords.map((word) => word.word).filter(Boolean));

  for (const item of items.slice(0, 4)) {
    const context = findReviewContext(item.label, lessons);
    const lesson = context.lesson;
    if (context.word && lesson) {
      exercises.push({
        id: `ai-word-${item.label}`,
        lessonTitle: lesson.title,
        question: {
          id: `ai-word-${item.label}`,
          skill: item.skill,
          type: "choice",
          prompt: `AI 複習：Which word means「${context.word.meaning}」?`,
          answer: context.word.word,
          options: fillOptions(context.word.word, allWordTexts)
        }
      });
      continue;
    }
    if (context.question && lesson) {
      exercises.push({
        id: `ai-question-${item.label}`,
        lessonTitle: lesson.title,
        question: {
          id: `ai-question-${item.label}`,
          skill: item.skill,
          type: "choice",
          prompt: `AI 相似題：${context.question.prompt}`,
          answer: context.question.answer,
          options: shuffleQuestionOptions(context.question.options, context.question.answer, `ai-${context.question.id}`)
        }
      });
      continue;
    }
    if (context.writing && lesson) {
      const target = context.writing.answerHint.split("/")[0]?.trim() || lesson.words[0]?.word || lesson.topic;
      exercises.push({
        id: `ai-writing-${item.label}`,
        lessonTitle: lesson.title,
        question: {
          id: `ai-writing-${item.label}`,
          skill: "write",
          type: "choice",
          prompt: `AI 寫作預備：這個空格可能要填哪個字？${context.writing.starter}`,
          answer: target,
          options: fillOptions(target, allWordTexts)
        }
      });
      continue;
    }
    const fallbackWord = allWords[0];
    if (fallbackWord) {
      exercises.push({
        id: `ai-fallback-${item.label}`,
        lessonTitle: "AI Review",
        question: {
          id: `ai-fallback-${item.label}`,
          skill: item.skill,
          type: "choice",
          prompt: `AI 複習：聽過或看過的單字「${fallbackWord.word}」是什麼意思？`,
          answer: fallbackWord.meaning,
          options: fillOptions(fallbackWord.meaning, allMeanings)
        }
      });
    }
  }

  return exercises.slice(0, 3);
}

function Review({ progress, lessons, speak, onAnswer }: {
  progress: StudentProgress;
  lessons: Lesson[];
  speak: (text: string, rate?: number) => void;
  onAnswer: (label: string, skill: Skill, correct: boolean, lessonId?: string, answer?: string, correctAnswer?: string) => void;
}) {
  const items = Object.values(progress.mistakes);
  const [filter, setFilter] = useState<"all" | "due" | "later">("all");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [written, setWritten] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [reviewSpeech, setReviewSpeech] = useState<Record<string, { transcript: string; score: number }>>({});
  const [recording, setRecording] = useState<string | null>(null);
  const reviewRecordingStopRef = useRef<(() => void) | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const dueItems = items.filter((item) => item.nextReview <= today);
  const laterItems = items.filter((item) => item.nextReview > today);
  const visibleItems = filter === "due" ? dueItems : filter === "later" ? laterItems : items;
  const aiExercises = useMemo(() => buildAiReviewExercises(visibleItems, lessons), [visibleItems, lessons]);
  const groupedLessons = useMemo(() => {
    return visibleItems.reduce((groups, item) => {
      const context = findReviewContext(item.label, lessons);
      const groupKey = context.lesson?.id || "unknown";
      const title = context.lesson?.title || "其他複習";
      const cover = context.lesson?.cover || "🚩";
      if (!groups[groupKey]) groups[groupKey] = { lesson: context.lesson, title, cover, items: [] as typeof visibleItems };
      groups[groupKey].items.push(item);
      return groups;
    }, {} as Record<string, { lesson?: Lesson; title: string; cover: string; items: typeof visibleItems }>);
  }, [lessons, visibleItems]);
  const selectedGroup = selectedLessonId ? groupedLessons[selectedLessonId] : null;

  useEffect(() => {
    return () => {
      reviewRecordingStopRef.current?.();
      reviewRecordingStopRef.current = null;
    };
  }, []);

  function choose(item: { label: string; skill: Skill }, question: ChoiceQuestion, answer: string, reviewLessonId?: string) {
    const correct = answer === question.answer;
    setPicked((current) => ({ ...current, [item.label]: answer }));
    setFeedback((current) => ({
      ...current,
      [item.label]: correct ? "答對了！這題會慢慢從再挑戰中移除。" : `再練一次，正確答案是 ${question.answer}。`
    }));
    onAnswer(item.label, item.skill, correct, reviewLessonId, answer, question.answer);
  }

  function practiceSpeech(item: { label: string; skill: Skill }, lesson: Lesson | undefined, task: SpeakingTask) {
    if (recording === item.label) {
      reviewRecordingStopRef.current?.();
      return;
    }
    setRecording(item.label);
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    reviewRecordingStopRef.current = startStudentSpeechSession({
      timeoutMs: 12000,
      onResult: (transcript) => {
      const score = scorePronunciation(task.target, transcript);
      setReviewSpeech((current) => ({ ...current, [item.label]: { transcript, score } }));
      setFeedback((current) => ({
        ...current,
        [item.label]: score >= 70 ? "口說通過，這題會慢慢從再挑戰移除。" : `目前 ${score} 分，建議再聽範例重讀一次。`
      }));
      onAnswer(item.label, "speak", score >= 70, lesson?.id, transcript || "未辨識到聲音", task.target);
      setRecording(null);
      reviewRecordingStopRef.current = null;
      },
      onError: (error) => {
        setFeedback((current) => ({ ...current, [item.label]: error.message }));
        setRecording(null);
        reviewRecordingStopRef.current = null;
      }
    });
  }

  function submitWriting(item: { label: string; skill: Skill }, lesson: Lesson | undefined, task: WritingTask) {
    const answer = written[item.label] || "";
    const correctAnswer = task.answerHint.trim();
    const correct = isWritingCorrect(answer, correctAnswer);
    setFeedback((current) => ({
      ...current,
      [item.label]: correct ? "寫得不錯，這題已重新記錄為答對。" : `還差一點，正確答案參考：${correctAnswer}。`
    }));
    onAnswer(item.label, item.skill, correct, lesson?.id, answer, correctAnswer);
  }

  return (
    <section>
      <div className="section-title">
        <div>
          <h3>再挑戰</h3>
          <p className="muted">先選擇單元，再重練該單元的聽、說、讀、寫錯題。</p>
        </div>
        <span className="pill blue">{items.length} 個項目</span>
      </div>
      <div className="segmented">
        <button className={filter === "all" ? "active" : ""} onClick={() => { setFilter("all"); setSelectedLessonId(null); }}>全部 {items.length}</button>
        <button className={filter === "due" ? "active" : ""} onClick={() => { setFilter("due"); setSelectedLessonId(null); }}>今天要複習 {dueItems.length}</button>
        <button className={filter === "later" ? "active" : ""} onClick={() => { setFilter("later"); setSelectedLessonId(null); }}>之後複習 {laterItems.length}</button>
      </div>

      {!selectedGroup && aiExercises.length > 0 && (
        <article className="panel ai-practice-panel review-ai-panel">
          <div>
            <p className="eyebrow">AI Practice</p>
            <h3>AI 加強練習</h3>
            <p className="muted">系統會根據目前錯題產生相似題，之後可接真正 AI 出題。</p>
          </div>
        </article>
      )}

      {!selectedGroup ? (
        <div className="review-unit-grid">
          {Object.entries(groupedLessons).length ? Object.entries(groupedLessons).map(([groupId, group]) => {
            const skills = unique(group.items.map((item) => skillLabels[item.skill]));
            const dueCount = group.items.filter((item) => item.nextReview <= today).length;
            return (
              <article className="review-unit-card" key={groupId}>
                <div className="scenario-cover">{group.cover}</div>
                <div>
                  <span className="pill blue">{group.items.length} 題再挑戰</span>
                  <h3>{group.title}</h3>
                  <p className="muted">{skills.join(" / ")} · 今天要複習 {dueCount} 題</p>
                </div>
                <button className="btn primary full" type="button" onClick={() => setSelectedLessonId(groupId)}>進入這個單元</button>
              </article>
            );
          }) : <div className="panel"><h3>目前沒有再挑戰項目</h3><p className="muted">做得很好。答錯或需要複習的內容會出現在這裡。</p></div>}
        </div>
      ) : (
        <article className="panel review-detail-page">
          <div className="section-title">
            <div>
              <p className="eyebrow">Review Unit</p>
              <h3>{selectedGroup.cover} {selectedGroup.title}</h3>
              <p className="muted">這裡只顯示本單元需要重練的題目。</p>
            </div>
            <button className="btn ghost" type="button" onClick={() => setSelectedLessonId(null)}>返回單元列表</button>
          </div>
          <div className="review-detail-list">
            {selectedGroup.items.map((item) => {
              const context = findReviewContext(item.label, lessons);
              const selected = picked[item.label];
              const speech = reviewSpeech[item.label];
              return (
                <article className="review-detail-card" key={item.label}>
                  <div className="review-head">
                    <span className="pill">{skillLabels[item.skill]}</span>
                    <span className="pill blue">錯 {item.count} 次</span>
                    <span className="pill">下次：{item.nextReview}</span>
                  </div>

                  {context.word ? (
                    <>
                      <div className="emoji">{context.word.image}</div>
                      <h3>{context.word.word}</h3>
                      <p>{context.word.meaning} · {context.word.part}</p>
                      <p className="muted">{context.word.example}<br />{context.word.translation}</p>
                      <button className="btn secondary" onClick={() => speak(context.word?.word || item.label)}>
                        <Headphones size={18} /> 發音
                      </button>
                    </>
                  ) : context.speaking ? (
                    <>
                      <p className="eyebrow">口說重練</p>
                      <h3>{context.speaking.target}</h3>
                      <p className="muted">{context.speaking.prompt}</p>
                      <div className="btns">
                        <button className="btn secondary" type="button" onClick={() => speak(context.speaking?.target || item.label, 0.78)}>
                          <Headphones size={18} /> 聽範例
                        </button>
                        <button className="btn primary" type="button" disabled={Boolean(recording && recording !== item.label)} onClick={() => practiceSpeech(item, context.lesson, context.speaking as SpeakingTask)}>
                          <Mic size={18} /> {recording === item.label ? "結束朗讀" : "開始朗讀"}
                        </button>
                      </div>
                      {speech && (
                        <div className="speech-transcript">
                          <span>AI 聽到：</span>
                          <strong>{speech.transcript}</strong>
                          <span>{speech.score} 分</span>
                        </div>
                      )}
                    </>
                  ) : context.question ? (
                    <>
                      <p className="eyebrow">重新練習</p>
                      <h3>{context.question.prompt}</h3>
                      {context.question.audio && (
                        <button className="btn secondary" onClick={() => speak(context.question?.audio || context.question?.prompt || item.label, 0.9)}>
                          <Headphones size={18} /> 重聽
                        </button>
                      )}
                      <div className="options review-options">
                        {shuffleQuestionOptions(context.question.options, context.question.answer, `review-${context.question.id}`).map((option) => (
                          <button
                            key={option}
                            className={`option ${selected && option === context.question?.answer ? "correct" : ""} ${selected === option && option !== context.question?.answer ? "wrong" : ""}`}
                            onClick={() => choose(item, context.question as ChoiceQuestion, option, context.lesson?.id)}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : context.writing ? (
                    <>
                      <p className="eyebrow">寫作重練</p>
                      <h3>用英文表達：{context.lesson ? writingMeaningHint(context.writing, context.lesson) : context.writing.starter}</h3>
                      <p className="muted">句型線索：{context.writing.starter.replace("____", "______")}</p>
                      <textarea
                        rows={3}
                        className="review-textarea"
                        placeholder="重新寫一次答案"
                        value={written[item.label] || ""}
                        onChange={(event) => setWritten((current) => ({ ...current, [item.label]: event.target.value }))}
                      />
                      <button className="btn secondary" disabled={!written[item.label]?.trim()} onClick={() => submitWriting(item, context.lesson, context.writing as WritingTask)}>
                        提交重練答案
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="eyebrow">複習項目</p>
                      <h3>{item.label}</h3>
                      <p className="muted">這個項目已記錄，之後可接更完整的題型。</p>
                    </>
                  )}

                  {feedback[item.label] && <p className={feedback[item.label].includes("答對") || feedback[item.label].includes("通過") ? "success-text" : "form-error"}>{feedback[item.label]}</p>}
                  <div className="btns review-actions">
                    <button className="btn ghost" onClick={() => onAnswer(item.label, item.skill, true, context.lesson?.id)}>我會了</button>
                    <button className="btn ghost" onClick={() => onAnswer(item.label, item.skill, false, context.lesson?.id)}>再練一次</button>
                  </div>
                </article>
              );
            })}
          </div>
        </article>
      )}
    </section>
  );
}

function Progress({ progress, student }: { progress: StudentProgress; student: StudentSession }) {
  const skillStats = (["listen", "speak", "read", "write"] as Skill[]).map((skill) => {
    const answers = progress.answers.filter((item) => item.skill === skill);
    const correct = answers.filter((item) => item.correct).length;
    const completedCount = Object.values(progress.completedSkills).filter((skills) => skills.includes(skill)).length;
    const percent = answers.length
      ? Math.round((correct / answers.length) * 100)
      : completedCount
        ? 100
        : 0;
    return { skill, percent, answered: answers.length, correct };
  });
  return (
    <section>
      <div className="section-title">
        <h3>{student.avatar} {student.name} 的學習進度</h3>
        <span className="pill blue">帳號 {student.code}</span>
      </div>
      <div className="metric-grid">
        <div className="metric"><strong>{progress.completedLessons.length}</strong><small>完成故事</small></div>
        <div className="metric"><strong>{progress.stars}</strong><small>星星</small></div>
        <div className="metric"><strong>{Object.keys(progress.mistakes).length}</strong><small>需要複習</small></div>
        <div className="metric"><strong>{progress.badges.length}</strong><small>徽章</small></div>
      </div>
      <div className="grid two" style={{ marginTop: 18 }}>
        <article className="panel">
          <h3>聽說讀寫能力</h3>
          {skillStats.map((item) => (
            <div className="bar-row" key={item.skill}>
              <label><span>{skillLabels[item.skill]}</span><span>{item.percent}%</span></label>
              <div className="progress"><span style={{ width: `${item.percent}%` }} /></div>
              <small>{item.answered ? `答對 ${item.correct}/${item.answered}` : "完成口說類任務會顯示進度"}</small>
            </div>
          ))}
        </article>
        <article className="panel">
          <h3>徽章展示</h3>
          {progress.badges.length ? progress.badges.map((badge) => <p key={badge}><Star size={16} /> {badge}</p>) : <p className="muted">完成任務後會得到徽章。</p>}
        </article>
      </div>
    </section>
  );
}
