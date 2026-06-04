"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import type { AppAssignment, ChoiceQuestion, CourseDraft, LearningLevel, Lesson, Skill, StudentProgress, StudentSession, Word, WritingTask } from "@/lib/types";

type Screen = "home" | "map" | "story" | "questVocab" | "vocab" | "listen" | "speak" | "read" | "write" | "review" | "progress";

type QuizTaskState = {
  index: number;
  feedback: string;
  picked: string;
};

type SpeakTaskState = {
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
  const studentLearningLevel = defaultLearningLevel(student?.proficiencyLevel);
  const lessons = useMemo(() => {
    if (!student) return allLessons;
    const assignedIds = new Set(assignments.map((assignment) => assignment.lesson_id));
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

  function speak(text: string, rate = speed) {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
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
                    const assignedLesson = lessons.find((lesson) => lesson.id === item.lesson_id);
                    return (
                      <article className="card assignment-card" key={item.id}>
                        <span className="pill">{item.skill === "all" ? "全部任務" : skillLabels[item.skill]}</span>
                        <h3>{assignedLesson?.title || item.lesson_id}</h3>
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
                                setLessonId(item.id);
                                setScreen("story");
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
        {screen === "listen" && <QuizTask key={`${lesson.id}-listen`} lesson={lesson} skill="listen" questions={listenQuestions} speak={speak} state={quizStateFor("listen")} onStateChange={(nextState) => updateQuizState("listen", nextState)} helpUsed={hasUsedHelp("listen")} onHelp={(question) => showOwlHelp("listen", question.answer, `這題可以聽關鍵字：${question.audio || question.prompt}`)} onAnswer={answerQuestion} onDone={() => { completeSkill("listen"); setScreen("speak"); }} />}
        {screen === "speak" && <SpeakTask lesson={lesson} speak={speak} state={speakStateFor()} onStateChange={updateSpeakState} helpUsed={hasUsedHelp("speak")} onHelp={(answer) => showOwlHelp("speak", answer, "先聽一次，再跟著 Owl 老師慢慢讀。")} onAnswer={answerPractice} onDone={() => { completeSkill("speak"); setScreen("read"); }} />}
        {screen === "read" && <QuizTask key={`${lesson.id}-read`} lesson={lesson} skill="read" questions={readQuestions} speak={speak} state={quizStateFor("read")} onStateChange={(nextState) => updateQuizState("read", nextState)} helpUsed={hasUsedHelp("read")} onHelp={(question) => showOwlHelp("read", question.answer, "閱讀時先找題目中的關鍵字，再回故事找相同或相近的意思。")} onAnswer={answerQuestion} onDone={() => { completeSkill("read"); setScreen("write"); }} />}
        {screen === "write" && <WriteTask lesson={lesson} state={writeStateFor()} onStateChange={updateWriteState} helpUsed={hasUsedHelp("write")} onHelp={(answer) => showOwlHelp("write", answer, "這是本單元寫作求助答案。看完後再自己輸入一次。")} onAnswer={answerPractice} onDone={() => { completeSkill("write"); setScreen("progress"); }} />}
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
  const allReady = lesson.words.length > 0 && lesson.words.every((item) => heard[item.word] && marked[item.word]);

  function mark(word: string, value: "known" | "review") {
    if (!heard[word]) return;
    setMarked((current) => ({ ...current, [word]: value }));
    onMark?.(word, value === "known");
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
            {showWordBank ? "收起收藏冊" : "打開單詞收藏冊"}
          </button>
        </div>
      </div>
      <div className="grid cards">
        {lesson.words.map((item) => (
          <article className="word-card" key={item.word}>
            <div className="word-card-body">
              <div className="emoji">{item.image}</div>
              <span className="pill">{item.level}</span>
              <strong>{item.word}</strong>
              <p>{item.meaning} · {item.part}</p>
              <p className="muted">{item.example}<br />{item.translation}</p>
              {!heard[item.word] && <p className="muted">先按「發音」，再判斷是否學會。</p>}
              {marked[item.word] === "known" && <p className="success-text">已記錄：我會了，獲得 1 顆星。</p>}
              {marked[item.word] === "review" && <p className="form-error">已加入再挑戰，之後可以複習。</p>}
            </div>
            <div className="btns word-actions">
              <button className="btn secondary" onClick={() => { speak(item.word); setHeard((current) => ({ ...current, [item.word]: true })); }}>發音</button>
              <button className="btn ghost" disabled={!heard[item.word]} onClick={() => mark(item.word, "known")}>我會了</button>
              <button className="btn ghost" disabled={!heard[item.word]} onClick={() => mark(item.word, "review")}>需要複習</button>
            </div>
          </article>
        ))}
      </div>

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

function QuizTask({ lesson, skill, questions, speak, state, onStateChange, helpUsed, onHelp, onAnswer, onDone }: {
  lesson: Lesson;
  skill: Skill;
  questions: ChoiceQuestion[];
  speak: (text: string, rate?: number) => void;
  state: QuizTaskState;
  onStateChange: (state: QuizTaskState) => void;
  helpUsed: boolean;
  onHelp: (question: ChoiceQuestion) => void;
  onAnswer: (question: ChoiceQuestion, answer: string) => boolean;
  onDone: () => void;
}) {
  const { index, feedback, picked } = state;
  const question = questions[index];
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
    setTaskState({
      picked: answer,
      feedback: onAnswer(question, answer) ? "答對了！你得到 1 顆星。" : `再試一次也沒關係，正確答案是 ${question.answer}。`
    });
  }

  function next() {
    if (index >= questions.length - 1) onDone();
    else {
      onStateChange({ index: index + 1, picked: "", feedback: "" });
    }
  }

  return (
    <section className="grid two">
      <article className="panel">
        <div className="section-title">
          <h3>{taskName(skill)} · {index + 1}/{questions.length}</h3>
          <div className="admin-actions">
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
          {picked && <button className="btn primary" onClick={next}>{index >= questions.length - 1 ? "完成任務" : "下一題"}</button>}
        </div>
      </article>
      <aside className="panel">
        <h3>任務小提醒</h3>
        <p className="muted">答錯會進入「再挑戰」，之後可以按技能分類複習。</p>
      </aside>
    </section>
  );
}

function SpeakTask({ lesson, speak, state, onStateChange, helpUsed, onHelp, onAnswer, onDone }: {
  lesson: Lesson;
  speak: (text: string, rate?: number) => void;
  state: SpeakTaskState;
  onStateChange: (state: SpeakTaskState) => void;
  helpUsed: boolean;
  onHelp: (answer: string) => void;
  onAnswer: (skill: Skill, label: string, correct: boolean, answer: string, correctAnswer: string) => void;
  onDone: () => void;
}) {
  const { done, heard, tries, transcripts = {}, scores = {}, feedback = {} } = state;
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState("");
  const allDone = lesson.speak.every((item) => done[item.id]);
  const nextTask = lesson.speak.find((item) => !done[item.id]) || lesson.speak[0];
  const setTaskState = (patch: Partial<SpeakTaskState>) => onStateChange({ ...state, ...patch });
  const speechSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  async function checkPronunciation(task: { id: string; prompt: string; target: string }) {
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
    try {
      const transcript = await listenToStudentSpeech();
      const score = scorePronunciation(task.target, transcript);
      const passed = score >= 70;
      const nextTries = (tries[task.id] || 0) + 1;
      const nextFeedback = buildSpeechFeedback(task.target, transcript, score);
      setTaskState({
        heard,
        tries: { ...tries, [task.id]: nextTries },
        transcripts: { ...transcripts, [task.id]: transcript },
        scores: { ...scores, [task.id]: score },
        feedback: { ...feedback, [task.id]: nextFeedback },
        done: passed ? { ...done, [task.id]: true } : done
      });
      onAnswer("speak", `${task.prompt}：${task.target}`, passed, transcript || "未辨識到聲音", task.target);
    } catch (error) {
      setSpeechError(error instanceof Error ? error.message : "沒有成功聽到聲音，請再試一次。");
    } finally {
      setRecordingId(null);
    }
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
            <span className="pill">AI 發音檢查</span>
            <button className="btn owl-help-btn" type="button" disabled={helpUsed || !nextTask} onClick={() => nextTask && onHelp(nextTask.target)}>
              {helpUsed ? "已用求助" : "Owl 求助"}
            </button>
          </div>
        </div>
        {lesson.speak.map((task) => (
          <div className="task-card speak-ai-card" key={task.id}>
            <p className="eyebrow">{task.prompt}</p>
            <h3>{task.target}</h3>
            <p className="muted">先聽範例，再按「開始朗讀」。AI 會聽你讀出的英文，判斷發音和咬字是否接近。</p>
            <div className="speak-score-card">
              <div className={`speak-score-ring ${done[task.id] ? "passed" : scores[task.id] ? "trying" : ""}`}>
                <strong>{scores[task.id] ?? "--"}</strong>
                <small>分</small>
              </div>
              <div>
                <strong>{done[task.id] ? "發音通過" : scores[task.id] ? "再調整一下" : "等待朗讀"}</strong>
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
                  heard: { ...heard, [task.id]: true },
                  tries
                });
              }}><Headphones size={18} /> 聽範例</button>
              <button className="btn primary speak-record-btn" disabled={!heard[task.id] || recordingId === task.id} onClick={() => checkPronunciation(task)}>
                <Mic size={18} /> {recordingId === task.id ? "正在聽你讀..." : done[task.id] ? "再讀一次" : "開始朗讀"}
              </button>
            </div>
          </div>
        ))}
        {speechError && <div className="feedback wrong-feedback">{speechError}</div>}
        <button className="btn primary full" disabled={!allDone} onClick={onDone}>完成口說任務</button>
      </article>
      <aside className="panel speak-coach-panel">
        <h3>Owl 口說教室</h3>
        <p className="muted">讀的時候靠近麥克風，慢慢說完整句子。70 分以上才算通過。</p>
        <div className="speak-tip-list">
          <span>1. 先聽範例</span>
          <span>2. 再自己朗讀</span>
          <span>3. 看 AI 回饋修正</span>
        </div>
      </aside>
    </section>
  );
}

function listenToStudentSpeech(): Promise<string> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      reject(new Error("這個瀏覽器不支援語音辨識。"));
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    let settled = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      settled = true;
      resolve(transcript.trim());
    };
    recognition.onerror = (event: any) => {
      settled = true;
      const reason = event.error === "not-allowed"
        ? "瀏覽器沒有麥克風權限，請允許使用麥克風。"
        : "沒有成功聽到聲音，請再讀一次。";
      reject(new Error(reason));
    };
    recognition.onend = () => {
      if (!settled) {
        settled = true;
        reject(new Error("沒有辨識到朗讀內容，請靠近麥克風再試一次。"));
      }
    };
    recognition.start();
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

function WriteTask({ lesson, state, onStateChange, helpUsed, onHelp, onAnswer, onDone }: {
  lesson: Lesson;
  state: WriteTaskState;
  onStateChange: (state: WriteTaskState) => void;
  helpUsed: boolean;
  onHelp: (answer: string) => void;
  onAnswer: (skill: Skill, label: string, correct: boolean, answer: string, correctAnswer: string) => void;
  onDone: () => void;
}) {
  const safeIndex = Math.min(state.index || 0, Math.max(lesson.write.length - 1, 0));
  const { answers, checked, aiTips } = state;
  const task = lesson.write[safeIndex];
  const complete = lesson.write.every((item) => checked[item.id]);
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
            <h3>{task.starter}</h3>
            <p className="muted">提示：{friendlyWritingHint(task, lesson)}</p>
            <div className="field">
              <textarea rows={4} placeholder="在這裡寫英文句子，不用怕錯，提交後會看到正確答案。" value={answers[task.id] || ""} onChange={(event) => setTaskState({ answers: { ...answers, [task.id]: event.target.value } })} />
            </div>
            <div className="btns">
              <button className="btn ghost" disabled={!answers[task.id]?.trim()} onClick={() => {
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
            {checked[task.id] && (
              <div className="btns">
                {safeIndex < lesson.write.length - 1 ? (
                  <button className="btn primary" type="button" onClick={() => setTaskState({ index: safeIndex + 1 })}>下一題</button>
                ) : (
                  <button className="btn primary" type="button" disabled={!complete} onClick={onDone}>完成寫作任務</button>
                )}
              </div>
            )}
          </div>
        )}
      </article>
      <aside className="panel">
        <h3>AI 寫作小老師</h3>
        <p className="muted">簡單版 AI 會先用規則幫學生看句子，給鼓勵和方向，不會直接代寫答案。</p>
        <div className="hint-board">
          {lesson.words.slice(0, 6).map((word) => (
            <span key={word.word}>{word.image} {word.part}</span>
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
  const usedLessonWords = lesson.words.filter((word) => lower.includes(word.word.toLowerCase()));
  const notes: string[] = [];

  if (words.length >= 5) {
    notes.push("句子內容比較完整，有開始表達想法。");
  } else if (words.length >= 2) {
    notes.push("你已經寫出關鍵字，可以再補一點細節。");
  } else {
    notes.push("先寫一個簡短句子也可以，例如加入人物、動作或物品。");
  }

  if (usedLessonWords.length) {
    notes.push(`有用到本課單字：${usedLessonWords.slice(0, 3).map((word) => word.word).join(", ")}。`);
  } else {
    notes.push("試著加入一個本課單字，句子會更貼近故事。");
  }

  if (/^[A-Z]/.test(clean)) {
    notes.push("開頭有大寫，格式很好。");
  } else {
    notes.push("英文句子開頭可以用大寫。");
  }

  if (/[.!?]$/.test(clean)) {
    notes.push("句尾有標點，讀起來更完整。");
  } else {
    notes.push("句尾可以加上句號。");
  }

  const hasLikelyAnswer = task.answerHint
    .split("/")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .some((item) => lower.includes(item));

  return {
    mood: hasLikelyAnswer ? "great" : words.length >= 3 ? "good" : "try",
    title: hasLikelyAnswer ? "很接近正確答案！" : words.length >= 3 ? "方向不錯，還可以更完整。" : "先完成一個小句子。",
    notes,
    nextStep: hasLikelyAnswer
      ? "現在可以按「提交答案」看看結果。"
      : `再看一次提示：「${friendlyWritingHint(task, lesson)}」`
  };
}

function friendlyWritingHint(task: { starter: string; answerHint: string }, lesson: Lesson) {
  const beforeBlank = task.starter.split("____")[0] || task.starter;
  const afterBlank = task.starter.split("____")[1] || "";
  const possibleParts = lesson.words
    .filter((word) => task.answerHint.toLowerCase().includes(word.word.toLowerCase()))
    .map((word) => word.part);
  const partHint = possibleParts.length ? `這裡可能需要 ${Array.from(new Set(possibleParts)).join(" / ")}。` : "先判斷這裡要填人物、物品、動作還是感覺。";
  const contextHint = beforeBlank || afterBlank
    ? `留意空格附近的字：「${beforeBlank.trim().slice(-18)} ____ ${afterBlank.trim().slice(0, 18)}」。`
    : "先看完整句子的意思，再選最自然的字。";
  return `${contextHint} ${partHint} 不確定時，可以先用本課單字造一個合理句子。`;
}

function isWritingCorrect(answer: string, correctAnswer: string) {
  const cleanAnswer = answer.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  const possibleAnswers = correctAnswer.split("/").map((item) => item.trim().toLowerCase()).filter(Boolean);
  return possibleAnswers.some((possible) => {
    const cleanCorrect = possible.replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
    return cleanCorrect.every((word) => cleanAnswer.includes(word));
  });
}

function findReviewContext(label: string, lessons: Lesson[]): { word?: Word; question?: ChoiceQuestion; writing?: WritingTask; lesson?: Lesson } {
  const wordLabel = label.replace(/^單字：/, "");
  for (const lesson of lessons) {
    const word = lesson.words.find((item) => item.word === wordLabel);
    if (word) return { word, lesson };

    const generatedQuestions = [...buildLessonPracticeQuestions(lesson, "listen"), ...buildLessonPracticeQuestions(lesson, "read")];
    const question = [...lesson.listen, ...lesson.read, ...generatedQuestions].find((item) => item.prompt === label);
    if (question) return { question, lesson };

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
  speak: (text: string) => void;
  onAnswer: (label: string, skill: Skill, correct: boolean, lessonId?: string, answer?: string, correctAnswer?: string) => void;
}) {
  const items = Object.values(progress.mistakes);
  const [filter, setFilter] = useState<"all" | "due" | "later">("all");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [written, setWritten] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const today = new Date().toISOString().slice(0, 10);
  const dueItems = items.filter((item) => item.nextReview <= today);
  const laterItems = items.filter((item) => item.nextReview > today);
  const visibleItems = filter === "due" ? dueItems : filter === "later" ? laterItems : items;
  const aiExercises = useMemo(() => buildAiReviewExercises(visibleItems, lessons), [visibleItems, lessons]);

  function choose(item: { label: string; skill: Skill }, question: ChoiceQuestion, answer: string, reviewLessonId?: string) {
    const correct = answer === question.answer;
    setPicked((current) => ({ ...current, [item.label]: answer }));
    setFeedback((current) => ({
      ...current,
      [item.label]: correct ? "答對了！這題會慢慢從再挑戰中移除。" : `再練一次，正確答案是 ${question.answer}。`
    }));
    onAnswer(item.label, item.skill, correct, reviewLessonId, answer, question.answer);
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
          <p className="muted">答錯或標記需要複習的內容會進入這裡，按日期安排複習。</p>
        </div>
        <span className="pill blue">{items.length} 個項目</span>
      </div>
      <div className="segmented">
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>全部 {items.length}</button>
        <button className={filter === "due" ? "active" : ""} onClick={() => setFilter("due")}>今天要複習 {dueItems.length}</button>
        <button className={filter === "later" ? "active" : ""} onClick={() => setFilter("later")}>之後複習 {laterItems.length}</button>
      </div>
      {aiExercises.length > 0 && (
        <article className="panel ai-practice-panel">
          <div className="section-title compact">
            <div>
              <p className="eyebrow">AI Practice</p>
              <h3>AI 加強練習</h3>
              <p className="muted">根據目前錯題自動生成幾題相似練習，先用簡單版 AI 規則產生。</p>
            </div>
          </div>
          <div className="grid cards">
            {aiExercises.map((exercise) => {
              const selected = picked[exercise.id];
              return (
                <div className="mini-practice" key={exercise.id}>
                  <span className="pill blue">{exercise.lessonTitle}</span>
                  <h3>{exercise.question.prompt}</h3>
                  <div className="options review-options">
                    {exercise.question.options.map((option) => (
                      <button
                        key={option}
                        className={`option ${selected && option === exercise.question.answer ? "correct" : ""} ${selected === option && option !== exercise.question.answer ? "wrong" : ""}`}
                        onClick={() => {
                          setPicked((current) => ({ ...current, [exercise.id]: option }));
                          setFeedback((current) => ({
                            ...current,
                            [exercise.id]: option === exercise.question.answer ? "答對了，這題是 AI 加強練習。" : `再想想，答案是 ${exercise.question.answer}。`
                          }));
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {feedback[exercise.id] && <p className="success-text">{feedback[exercise.id]}</p>}
                </div>
              );
            })}
          </div>
        </article>
      )}
      <div className="grid cards">
        {visibleItems.length ? visibleItems.map((item) => {
          const context = findReviewContext(item.label, lessons);
          const selected = picked[item.label];
          return (
            <article className="card review-card" key={item.label}>
              <div className="review-card-main">
                <div className="review-head">
                  <span className="pill">{skillLabels[item.skill]}</span>
                  {context.lesson && <span className="pill blue">{context.lesson.title}</span>}
                </div>

                {context.word ? (
                  <>
                    <div className="emoji">{context.word.image}</div>
                    <h3>{context.word.word}</h3>
                    <p>{context.word.meaning} · {context.word.part}</p>
                    <p className="muted">{context.word.example}<br />{context.word.translation}</p>
                  </>
                ) : context.question ? (
                  <>
                    <p className="eyebrow">重新練習</p>
                    <h3>{context.question.prompt}</h3>
                    {context.question.audio && (
                      <button className="btn secondary" onClick={() => speak(context.question?.audio || context.question?.prompt || item.label)}>
                        <Headphones size={18} /> 重聽
                      </button>
                    )}
                    <div className="options review-options">
                      {context.question.options.map((option) => (
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
                    <h3>{context.writing.starter}</h3>
                    <p className="muted">提示：{context.lesson ? friendlyWritingHint(context.writing, context.lesson) : "先看空格前後文，再選最自然的字。"}</p>
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

                <p className="muted">錯誤次數：{item.count}<br />下次複習：{item.nextReview}</p>
                {feedback[item.label] && <p className="success-text">{feedback[item.label]}</p>}
              </div>

              <div className="btns review-actions">
                {context.word && <button className="btn secondary" onClick={() => speak(context.word?.word || item.label)}>發音</button>}
                <button className="btn ghost" onClick={() => onAnswer(item.label, item.skill, true, context.lesson?.id)}>我會了</button>
                <button className="btn ghost" onClick={() => onAnswer(item.label, item.skill, false, context.lesson?.id)}>再練一次</button>
              </div>
            </article>
          );
        }) : <div className="panel"><h3>這一類目前沒有項目</h3><p className="muted">做得很好。答錯或需要複習的內容會出現在這裡。</p></div>}
      </div>
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
