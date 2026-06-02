"use client";

import { useEffect, useMemo, useState } from "react";
import { Headphones, LogOut, Mic, QrCode, Sparkles, Star, UserRound } from "lucide-react";
import { appLessons } from "@/data/lessons";
import { isSupabaseReady, signInStudent, signOut, signUpStudent } from "@/lib/auth";
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
import type { ChoiceQuestion, Lesson, Skill, StudentProgress, StudentSession } from "@/lib/types";

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
  const lesson = useMemo(() => appLessons.find((item) => item.id === lessonId) || appLessons[0], [lessonId]);

  useEffect(() => {
    const savedStudent = loadStudentSession();
    if (savedStudent) {
      setStudent(savedStudent);
      loadCloudProgress(savedStudent.id).then(setProgress);
    }
  }, []);

  useEffect(() => {
    if (student && progress) saveCloudProgress(student.id, progress);
  }, [progress, student]);

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

  function mutateProgress(mutator: (draft: StudentProgress) => void) {
    setProgress((current) => {
      const next = structuredClone(current || loadLocalProgress(activeStudent.id));
      mutator(next);
      return next;
    });
  }

  function speak(text: string) {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = speed;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function completeSkill(skill: Skill) {
    mutateProgress((draft) => recordSkill(draft, lesson.id, skill));
  }

  function answerQuestion(question: ChoiceQuestion, answer: string) {
    const correct = answer === question.answer;
    mutateProgress((draft) => recordAnswer(draft, lesson.id, question.skill, question.prompt, correct));
    return correct;
  }

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <div className="brand-logo">S</div>
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
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button key={item.id} className={screen === item.id ? "active" : ""} onClick={() => setScreen(item.id)}>
              {item.label}
            </button>
          ))}
          <a className="btn secondary full" href="/qr"><QrCode size={18} /> QR Code</a>
          <a className="btn secondary full" href="/admin">教師後台</a>
          <button className="btn secondary full" onClick={logoutStudent}><LogOut size={18} /> 登出 / 切換學生</button>
        </nav>

        <div className="side-card">
          <strong>今日目標</strong>
          <p className="muted">完成故事、單字、聽說讀寫任務。</p>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">For Primary Students</p>
            <h2>{titleFor(screen)}</h2>
          </div>
          <div className="stat-row">
            <div className="stat"><strong>{progress.stars}</strong><small>星星</small></div>
            <div className="stat"><strong>{progress.completedLessons.length}</strong><small>完成故事</small></div>
            <div className="stat"><strong>{Object.keys(progress.mistakes).length}</strong><small>再挑戰</small></div>
          </div>
        </header>

        {screen === "home" && (
          <>
            <section className="hero">
              <div>
                <p className="eyebrow">Today&apos;s Story Mission</p>
                <h3>{lesson.title}</h3>
                <p>
                  嗨，{student.name}！今天跟著故事完成聽、說、讀、寫四個任務。每完成一個任務都會累積進度，全部完成後解鎖下一個故事。
                </p>
                <div className="btns">
                  <button className="btn primary" onClick={() => setScreen("story")}><Sparkles size={18} /> 開始故事任務</button>
                  <button className="btn secondary" onClick={() => setScreen("map")}>查看課程地圖</button>
                </div>
              </div>
              <div className="mascot">
                <span>{lesson.cover}</span>
                <strong>{lesson.topic}</strong>
                <small>{lesson.pattern}</small>
              </div>
            </section>

            <div className="section-title"><h3>四項任務進度</h3></div>
            <div className="grid cards">
              {(["listen", "speak", "read", "write"] as Skill[]).map((skill) => (
                <div className="card" key={skill}>
                  <span className="pill blue">{skillLabels[skill]}</span>
                  <h3>{taskName(skill)}</h3>
                  <p className="muted">{lessonSkills.includes(skill) ? "已完成，做得好！" : "尚未完成"}</p>
                  <div className="progress"><span style={{ width: lessonSkills.includes(skill) ? "100%" : "20%" }} /></div>
                </div>
              ))}
            </div>
          </>
        )}

        {screen === "map" && (
          <section>
            <div className="section-title"><h3>故事關卡地圖</h3><span className="pill">完成一關解鎖下一關</span></div>
            <div className="grid cards">
              {appLessons.map((item, index) => {
                const completed = progress.completedLessons.includes(item.id);
                const unlocked = index === 0 || progress.completedLessons.includes(appLessons[index - 1].id);
                return (
                  <article className="card lesson-card" key={item.id}>
                    <div className="lesson-cover">{item.cover}</div>
                    <span className={completed ? "pill" : "pill blue"}>{completed ? "已完成" : unlocked ? "可開始" : "未解鎖"}</span>
                    <h3>{item.title}</h3>
                    <p className="muted">{item.topic} · Level {item.level}</p>
                    <button className="btn primary" disabled={!unlocked} onClick={() => { setLessonId(item.id); setScreen("story"); }}>
                      {unlocked ? "進入故事" : "先完成前一關"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {screen === "story" && <Story lesson={lesson} showZh={showZh} setShowZh={setShowZh} speed={speed} setSpeed={setSpeed} speak={speak} next={() => setScreen("vocab")} />}
        {screen === "vocab" && <Vocabulary lesson={lesson} speak={speak} next={() => setScreen("listen")} />}
        {screen === "listen" && <QuizTask lesson={lesson} skill="listen" questions={lesson.listen} speak={speak} onAnswer={answerQuestion} onDone={() => { completeSkill("listen"); setScreen("speak"); }} />}
        {screen === "speak" && <SpeakTask lesson={lesson} speak={speak} onDone={() => { completeSkill("speak"); setScreen("read"); }} />}
        {screen === "read" && <QuizTask lesson={lesson} skill="read" questions={lesson.read} speak={speak} onAnswer={answerQuestion} onDone={() => { completeSkill("read"); setScreen("write"); }} />}
        {screen === "write" && <WriteTask lesson={lesson} onDone={() => { completeSkill("write"); setScreen("progress"); }} />}
        {screen === "review" && <Review progress={progress} />}
        {screen === "progress" && <Progress progress={progress} student={student} />}
      </main>
    </div>
  );
}

function StudentLogin({ onEnter }: { onEnter: (student: StudentSession) => Promise<void> }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(avatars[0]);
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
      ? await signUpStudent({ username, password, name, avatar })
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
          {error && <p className="form-error">{error}</p>}
          <button className="btn primary full" type="submit" disabled={busy}>
            <UserRound size={18} /> {busy ? "處理中..." : mode === "login" ? "登入學習" : "建立學生帳號"}
          </button>
        </form>

        <div className="demo-login">
          <button className="btn secondary full" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "還沒有帳號？註冊學生帳號" : "已有帳號？回到登入"}
          </button>
          <p className="muted">示範登入仍可用，但只保存於本機瀏覽器。</p>
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
  return (
    <section className="grid two">
      <article className="panel">
        <div className="section-title">
          <h3>{lesson.cover} {lesson.title}</h3>
          <span className="pill">{lesson.topic}</span>
        </div>
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

function Vocabulary({ lesson, speak, next }: { lesson: Lesson; speak: (text: string) => void; next: () => void }) {
  return (
    <section>
      <div className="section-title"><h3>故事重點單字</h3><button className="btn primary" onClick={next}>下一步：聽力任務</button></div>
      <div className="grid cards">
        {lesson.words.map((item) => (
          <article className="word-card" key={item.word}>
            <div className="emoji">{item.image}</div>
            <span className="pill">{item.level}</span>
            <strong>{item.word}</strong>
            <p>{item.meaning} · {item.part}</p>
            <p className="muted">{item.example}<br />{item.translation}</p>
            <div className="btns">
              <button className="btn secondary" onClick={() => speak(item.word)}>發音</button>
              <button className="btn ghost">我會了</button>
              <button className="btn ghost">需要複習</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function QuizTask({ lesson, skill, questions, speak, onAnswer, onDone }: {
  lesson: Lesson;
  skill: Skill;
  questions: ChoiceQuestion[];
  speak: (text: string) => void;
  onAnswer: (question: ChoiceQuestion, answer: string) => boolean;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [picked, setPicked] = useState("");
  const question = questions[index];

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
          {question.audio && <button className="btn secondary" onClick={() => speak(question.audio || question.prompt)}><Headphones size={18} /> 重播音訊</button>}
          <div className="options">
            {question.options.map((option) => (
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

function SpeakTask({ lesson, speak, onDone }: { lesson: Lesson; speak: (text: string) => void; onDone: () => void }) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const allDone = lesson.speak.every((item) => done[item.id]);
  return (
    <section className="grid two">
      <article className="panel">
        <div className="section-title"><h3>Speak 口說任務</h3><span className="pill">AI 發音教練可作第二階段接入</span></div>
        {lesson.speak.map((task) => (
          <div className="task-card" key={task.id}>
            <p className="eyebrow">{task.prompt}</p>
            <h3>{task.target}</h3>
            <div className="btns">
              <button className="btn secondary" onClick={() => speak(task.target)}><Mic size={18} /> 聽範例</button>
              <button className="btn primary" onClick={() => setDone({ ...done, [task.id]: true })}>
                {done[task.id] ? "已完成" : "我跟讀了"}
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

function WriteTask({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const complete = lesson.write.every((item) => answers[item.id]?.trim());
  return (
    <section className="grid two">
      <article className="panel">
        <div className="section-title"><h3>Write 寫作任務</h3><span className="pill">由簡到難</span></div>
        {lesson.write.map((task) => (
          <div className="task-card" key={task.id}>
            <p className="eyebrow">{task.prompt}</p>
            <h3>{task.starter}</h3>
            <p className="muted">提示：{task.answerHint}</p>
            <div className="field">
              <textarea rows={3} placeholder="在這裡寫英文句子" value={answers[task.id] || ""} onChange={(event) => setAnswers({ ...answers, [task.id]: event.target.value })} />
            </div>
          </div>
        ))}
        <button className="btn primary full" disabled={!complete} onClick={onDone}>完成寫作任務</button>
      </article>
      <aside className="panel">
        <h3>AI 寫作小幫手</h3>
        <p className="muted">MVP 先儲存學生輸入，第二階段可加入 AI 批改與鼓勵式修正。</p>
      </aside>
    </section>
  );
}

function Review({ progress }: { progress: StudentProgress }) {
  const items = Object.values(progress.mistakes);
  return (
    <section>
      <div className="section-title"><h3>再挑戰</h3><span className="pill blue">{items.length} 個項目</span></div>
      <div className="grid cards">
        {items.length ? items.map((item) => (
          <article className="card" key={item.label}>
            <span className="pill">{skillLabels[item.skill]}</span>
            <h3>{item.label}</h3>
            <p className="muted">錯誤次數：{item.count}<br />下次複習：{item.nextReview}</p>
          </article>
        )) : <div className="panel"><h3>目前沒有錯題</h3><p className="muted">做得很好，答錯的題目會出現在這裡。</p></div>}
      </div>
    </section>
  );
}

function Progress({ progress, student }: { progress: StudentProgress; student: StudentSession }) {
  const skillStats = (["listen", "speak", "read", "write"] as Skill[]).map((skill) => {
    const answers = progress.answers.filter((item) => item.skill === skill);
    const correct = answers.filter((item) => item.correct).length;
    return { skill, percent: answers.length ? Math.round((correct / answers.length) * 100) : 0 };
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
