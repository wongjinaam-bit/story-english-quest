"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Headphones, LogOut, Mic, QrCode, Sparkles, Star, UserRound } from "lucide-react";
import { appLessons } from "@/data/lessons";
import { isSupabaseReady, signInStudent, signOut, signUpStudent } from "@/lib/auth";
import { mergePublishedLessons } from "@/lib/course-drafts";
import { canStudentSeeLesson, defaultLearningLevel, learningLevelDescriptions, learningLevelLabels, lessonDifficulty } from "@/lib/learning-levels";
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

type Screen = "home" | "map" | "story" | "vocab" | "listen" | "speak" | "read" | "write" | "review" | "progress";

const navItems: { id: Screen; label: string }[] = [
  { id: "home", label: "今日任務" },
  { id: "map", label: "課程地圖" },
  { id: "story", label: "故事" },
  { id: "vocab", label: "單字" },
  { id: "review", label: "再挑戰" },
  { id: "progress", label: "進度" }
];

const skillLabels: Record<Skill, string> = {
  listen: "聽",
  speak: "說",
  read: "讀",
  write: "寫"
};

const avatars = ["⭐", "🚀", "🌈", "📚", "🎯", "🏆"];

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
  const lessons = useMemo(() => {
    if (!student) return allLessons;
    const level = defaultLearningLevel(student.proficiencyLevel);
    const assignedIds = new Set(assignments.map((assignment) => assignment.lesson_id));
    return sortCourseMapLessons(allLessons.filter((item) => canStudentSeeLesson(level, item, assignedIds.has(item.id))));
  }, [allLessons, assignments, student]);
  const lesson = useMemo(() => lessons.find((item) => item.id === lessonId) || lessons[0] || appLessons[0], [lessonId, lessons]);
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
    if (lessons.length && !lessons.some((item) => item.id === lessonId)) {
      setLessonId(lessons[0].id);
    }
  }, [lessonId, lessons]);

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

  useEffect(() => {
    const savedStudent = loadStudentSession();
    if (savedStudent) {
      setStudent(savedStudent);
      loadCloudProgress(savedStudent.id).then(setProgress);
    }
  }, []);

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
    setProgress(await loadCloudProgress(nextStudent.id));
    setScreen("home");
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
  const recommendedScreen: Screen = !lessonSkills.length ? "story" : nextSkill || "progress";
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

  async function startAssignment(assignment: AppAssignment) {
    const nextLessons = await loadPublishedCourses();
    if (!nextLessons.some((item) => item.id === assignment.lesson_id)) {
      setCloudStatus("任務課程尚未發布到學生端，請老師先到課程內容管理發布這門課。");
      return;
    }
    setLessonId(assignment.lesson_id);
    setScreen(assignment.skill === "all" ? "story" : assignment.skill);
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
            <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => setScreen(item.id)}>
              {item.label}{item.id === "home" && assignments.length ? `（${assignments.length}）` : ""}
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
            <div className="stat"><strong>{progress.stars}</strong><small>星星</small></div>
            <div className="stat"><strong>{progress.streak || 0}</strong><small>連續打卡</small></div>
            <div className="stat"><strong>{progress.completedLessons.length}</strong><small>完成故事</small></div>
            <div className="stat"><strong>{Object.keys(progress.mistakes).length}</strong><small>再挑戰</small></div>
          </div>
        </header>

        {student.mode === "supabase" && assignments.length > 0 && screen !== "home" && (
          <div className="notice-box local-warning">
            <strong>老師指定任務</strong>
            <p>你有 {assignments.length} 個任務待完成。老師指定的課程會優先開放，即使課程地圖原本還未解鎖也可以開始。</p>
            <div className="btns">
              <button className="btn primary" type="button" onClick={() => startAssignment(assignments[0])}>開始最新任務</button>
              <button className="btn secondary" type="button" onClick={() => setScreen("home")}>查看全部任務</button>
            </div>
          </div>
        )}

        {screen === "home" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">Today&apos;s Story Mission</p>
                <h3>{lesson.title}</h3>
                <p>
                  嗨，{student.name}！歡迎來到英文小教室。跟著 Owl 老師完成聽、說、讀、寫四個任務，收集星星並解鎖下一個故事。
                </p>
                <div className="btns">
                  <button className="btn primary" onClick={() => setScreen(recommendedScreen)}><Sparkles size={18} /> {recommendedLabel}</button>
                  <button className="btn secondary" onClick={() => setScreen("map")}>查看課程地圖</button>
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

            <section className="learning-path">
              {[
                { label: "故事", done: lessonSkills.length > 0 || progress.completedLessons.includes(lesson.id) },
                { label: "單字", done: lessonSkills.length > 0 || progress.completedLessons.includes(lesson.id) },
                { label: "聽力", done: lessonSkills.includes("listen") },
                { label: "口說", done: lessonSkills.includes("speak") },
                { label: "閱讀", done: lessonSkills.includes("read") },
                { label: "寫作", done: lessonSkills.includes("write") }
              ].map((step, index) => (
                <div className={step.done ? "path-step done" : "path-step"} key={step.label}>
                  <strong>{index + 1}</strong>
                  <span>{step.label}</span>
                </div>
              ))}
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
          <section>
            <div className="section-title">
              <h3>故事關卡地圖</h3>
              <div className="admin-actions">
                <span className="pill">完成一關解鎖下一關</span>
                <button className="btn secondary" type="button" onClick={loadPublishedCourses}>重新整理課程</button>
              </div>
            </div>
            <div className="grid cards">
              {lessons.map((item, index) => {
                const completed = progress.completedLessons.includes(item.id);
                const assigned = assignments.some((assignment) => assignment.lesson_id === item.id);
                const unlockState = getLessonUnlockState(item, index, lessons, progress.completedLessons, assigned);
                return (
                  <article className="card lesson-card" key={item.id}>
                    <div className="lesson-cover">{item.cover}</div>
                    <div className="review-head">
                      <span className={completed ? "pill" : "pill blue"}>{completed ? "已完成" : unlockState.unlocked ? "可開始" : "未解鎖"}</span>
                      {assigned && <span className="pill">老師指定</span>}
                    </div>
                    <h3>{item.title}</h3>
                    <p className="muted">{item.topic} · Level {item.level}</p>
                    <p className="muted">{unlockState.reason}</p>
                    <button className={unlockState.unlocked ? "btn primary full" : "btn secondary full"} disabled={!unlockState.unlocked} onClick={() => { setLessonId(item.id); setScreen("story"); }}>
                      {unlockState.unlocked ? "進入故事" : unlockState.lockLabel}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {screen === "story" && <Story lesson={lesson} showZh={showZh} setShowZh={setShowZh} speed={speed} setSpeed={setSpeed} speak={speak} next={() => setScreen("vocab")} />}
        {screen === "vocab" && <Vocabulary lesson={lesson} learnedWords={learnedWords} speak={speak} next={() => setScreen("listen")} onMark={markVocabulary} />}
        {screen === "listen" && <QuizTask key={`${lesson.id}-listen`} lesson={lesson} skill="listen" questions={listenQuestions} speak={speak} onAnswer={answerQuestion} onDone={() => { completeSkill("listen"); setScreen("speak"); }} />}
        {screen === "speak" && <SpeakTask lesson={lesson} speak={speak} onAnswer={answerPractice} onDone={() => { completeSkill("speak"); setScreen("read"); }} />}
        {screen === "read" && <QuizTask key={`${lesson.id}-read`} lesson={lesson} skill="read" questions={readQuestions} speak={speak} onAnswer={answerQuestion} onDone={() => { completeSkill("read"); setScreen("write"); }} />}
        {screen === "write" && <WriteTask lesson={lesson} onAnswer={answerPractice} onDone={() => { completeSkill("write"); setScreen("progress"); }} />}
        {screen === "review" && <Review progress={progress} lessons={allLessons} speak={speak} onAnswer={answerReview} />}
        {screen === "progress" && <Progress progress={progress} student={student} />}
      </main>
      {celebrationLesson && <Celebration lesson={celebrationLesson} streak={progress.streak} onClose={() => setCelebrationLesson(null)} />}
    </div>
  );
}

function getLessonUnlockState(item: Lesson, index: number, lessons: Lesson[], completedLessons: string[], assigned = false) {
  if (completedLessons.includes(item.id)) {
    return { unlocked: true, reason: "你已完成這一課。", lockLabel: "已完成" };
  }
  if (assigned) {
    return { unlocked: true, reason: "老師已指定這個任務，所以可以直接開始。", lockLabel: "開始老師任務" };
  }
  if (item.unlockMode === "open" || index === 0) {
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
  const previous = lessons[index - 1];
  const unlocked = !previous || completedLessons.includes(previous.id);
  return {
    unlocked,
    reason: unlocked ? "已完成上一課，可以開始。" : `需先完成上一課：${previous.title}`,
    lockLabel: "先完成前一關"
  };
}

function sortCourseMapLessons(items: Lesson[]) {
  return [...items].sort((a, b) => {
    const sortDiff = (a.sortOrder || 999000) - (b.sortOrder || 999000);
    if (sortDiff) return sortDiff;
    const levelDiff = a.level - b.level;
    if (levelDiff) return levelDiff;
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
          <strong>Today</strong>
          <span>{lesson.topic}</span>
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
        <div className="word-card-mini">word</div>
        <div className="pencil-mini" />
        <div className="book-mini">ABC</div>
      </div>
      <div className="owl-teacher">
        <div className="speech-bubble">Hello!</div>
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
  speak: (text: string) => void;
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

function Vocabulary({ lesson, learnedWords, speak, next, onMark }: {
  lesson: Lesson;
  learnedWords: (Word & { lessonTitle: string; lessonId: string })[];
  speak: (text: string) => void;
  next: () => void;
  onMark: (word: string, known: boolean) => void;
}) {
  const [marked, setMarked] = useState<Record<string, "known" | "review">>({});
  const [heard, setHeard] = useState<Record<string, boolean>>({});
  const allReady = lesson.words.length > 0 && lesson.words.every((item) => heard[item.word] && marked[item.word]);

  function mark(word: string, value: "known" | "review") {
    if (!heard[word]) return;
    setMarked((current) => ({ ...current, [word]: value }));
    onMark(word, value === "known");
  }

  return (
    <section>
      <div className="section-title">
        <div>
          <h3>故事重點單字</h3>
          <p className="muted">請先聽發音，再選「我會了」或「需要複習」。全部完成後才能進入聽力。</p>
        </div>
        <button className="btn primary" disabled={!allReady} onClick={next}>下一步：聽力任務</button>
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
      {learnedWords.length > 0 && (
        <>
          <div className="section-title">
            <div>
              <h3>我的單詞收藏冊</h3>
              <p className="muted">只顯示你之前做過的單元單字，還沒學過的單元不會出現在這裡。</p>
            </div>
            <span className="pill blue">{learnedWords.length} 個已學單字</span>
          </div>
          <div className="word-bank">
            {learnedWords.map((item) => (
              <button className="word-chip" key={`${item.lessonId}-${item.word}`} onClick={() => speak(item.word)}>
                <span>{item.image}</span>
                <strong>{item.word}</strong>
                <small>{item.meaning} · {item.lessonTitle}</small>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function QuizTask({ lesson, skill, questions, speak, onAnswer, onDone }: {
  lesson: Lesson;
  skill: Skill;
  questions: ChoiceQuestion[];
  speak: (text: string, rate?: number) => void;
  onAnswer: (question: ChoiceQuestion, answer: string) => boolean;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [picked, setPicked] = useState("");
  const question = questions[index];
  const displayedOptions = useMemo(
    () => question ? shuffleQuestionOptions(question.options, question.answer, question.id) : [],
    [question]
  );

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
    setPicked(answer);
    setFeedback(onAnswer(question, answer) ? "答對了！你得到 1 顆星。" : `再試一次也沒關係，正確答案是 ${question.answer}。`);
  }

  function next() {
    if (index >= questions.length - 1) onDone();
    else {
      setIndex(index + 1);
      setPicked("");
      setFeedback("");
    }
  }

  return (
    <section className="grid two">
      <article className="panel">
        <div className="section-title">
          <h3>{taskName(skill)} · {index + 1}/{questions.length}</h3>
          <span className="pill">{lesson.title}</span>
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

function SpeakTask({ lesson, speak, onAnswer, onDone }: {
  lesson: Lesson;
  speak: (text: string) => void;
  onAnswer: (skill: Skill, label: string, correct: boolean, answer: string, correctAnswer: string) => void;
  onDone: () => void;
}) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [heard, setHeard] = useState<Record<string, boolean>>({});
  const [tries, setTries] = useState<Record<string, number>>({});
  const allDone = lesson.speak.every((item) => done[item.id]);
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
        <div className="section-title"><h3>Speak 口說任務</h3><span className="pill">AI 發音教練可作第二階段接入</span></div>
        {lesson.speak.map((task) => (
          <div className="task-card" key={task.id}>
            <p className="eyebrow">{task.prompt}</p>
            <h3>{task.target}</h3>
            <p className="muted">步驟：先聽範例，再大聲跟讀，最後按「我已跟讀」。</p>
            <div className="btns">
              <button className="btn secondary" onClick={() => {
                speak(task.target);
                setHeard((current) => ({ ...current, [task.id]: true }));
                setTries((current) => ({ ...current, [task.id]: (current[task.id] || 0) + 1 }));
              }}><Mic size={18} /> 聽範例</button>
              <button className="btn primary" disabled={!heard[task.id]} onClick={() => {
                setDone({ ...done, [task.id]: true });
                onAnswer("speak", `${task.prompt}：${task.target}`, true, `已跟讀 ${tries[task.id] || 1} 次`, task.target);
              }}>
                {done[task.id] ? "已完成" : "我已跟讀"}
              </button>
            </div>
          </div>
        ))}
        <button className="btn primary full" disabled={!allDone} onClick={onDone}>完成口說任務</button>
      </article>
      <aside className="panel">
        <h3>鼓勵式回饋</h3>
        <p className="muted">Great! Good try! Try again with one word. 第二階段可接 AI 發音教練。</p>
      </aside>
    </section>
  );
}

function WriteTask({ lesson, onAnswer, onDone }: {
  lesson: Lesson;
  onAnswer: (skill: Skill, label: string, correct: boolean, answer: string, correctAnswer: string) => void;
  onDone: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, { correct: boolean; correctAnswer: string }>>({});
  const [aiTips, setAiTips] = useState<Record<string, WritingFeedback>>({});
  const complete = lesson.write.every((item) => checked[item.id]);
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
        <div className="section-title"><h3>Write 寫作任務</h3><span className="pill">由簡到難</span></div>
        {lesson.write.map((task) => (
          <div className="task-card" key={task.id}>
            <p className="eyebrow">{task.prompt}</p>
            <h3>{task.starter}</h3>
            <p className="muted">提示：{friendlyWritingHint(task, lesson)}</p>
            <div className="field">
              <textarea rows={3} placeholder="在這裡寫英文句子，不用怕錯，提交後會看到正確答案。" value={answers[task.id] || ""} onChange={(event) => setAnswers({ ...answers, [task.id]: event.target.value })} />
            </div>
            <div className="btns">
              <button className="btn ghost" disabled={!answers[task.id]?.trim()} onClick={() => {
                setAiTips((current) => ({ ...current, [task.id]: getSimpleWritingFeedback(answers[task.id] || "", task, lesson) }));
              }}>AI 小提示</button>
              <button className="btn secondary" disabled={!answers[task.id]?.trim() || Boolean(checked[task.id])} onClick={() => {
                const answer = answers[task.id] || "";
                const correctAnswer = task.answerHint.trim();
                const correct = isWritingCorrect(answer, correctAnswer);
                setChecked((current) => ({ ...current, [task.id]: { correct, correctAnswer } }));
                onAnswer("write", `${task.prompt}：${task.starter}`, correct, answer, correctAnswer);
              }}>提交答案</button>
            </div>
            {aiTips[task.id] && <WritingFeedbackCard feedback={aiTips[task.id]} />}
            {checked[task.id] && (
              <p className={checked[task.id].correct ? "success-text" : "form-error"}>
                {checked[task.id].correct ? "寫得很好！" : `還差一點，正確答案參考：${checked[task.id].correctAnswer}`}
              </p>
            )}
          </div>
        ))}
        <button className="btn primary full" disabled={!complete} onClick={onDone}>完成寫作任務</button>
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

type WritingFeedback = {
  mood: "great" | "good" | "try";
  title: string;
  notes: string[];
  nextStep: string;
};

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
