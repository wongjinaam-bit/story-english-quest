"use client";

import { useEffect, useMemo, useState } from "react";
import { appLessons } from "@/data/lessons";
import { isSupabaseReady, signInStaff, signOut } from "@/lib/auth";
import { mergePublishedLessons } from "@/lib/course-drafts";
import { defaultLearningLevel, learningLevelLabels, lessonDifficulty } from "@/lib/learning-levels";
import { supabase } from "@/lib/supabase";
import type { AppAssignment, CourseDraft, LearningLevel, Lesson, Profile, Skill, StudentProgress, UserRole } from "@/lib/types";

type AdminTab = "dashboard" | "students" | "assignments" | "courses" | "admin";

type StudentRow = {
  profile: Profile;
  progress: StudentProgress | null;
  updated_at: string | null;
};

const demoStudents = [
  { id: "s1", name: "Amy Chen", username: "s001", completed: 3, weak: "Listening", stars: 42 },
  { id: "s2", name: "Ben Lin", username: "s002", completed: 2, weak: "Writing", stars: 31 },
  { id: "s3", name: "Mia Wong", username: "s003", completed: 5, weak: "Speaking", stars: 78 }
];

export function AdminApp() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>("teacher");
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [error, setError] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const supabaseReady = isSupabaseReady();

  async function login(email: string, password: string) {
    setError("");
    if (!supabaseReady) {
      const okTeacher = email === "teacher@example.com" && password === "teacher123";
      const okAdmin = email === "admin@example.com" && password === "admin123";
      if (okTeacher || okAdmin) {
        setRole(okAdmin ? "admin" : "teacher");
        setLoggedIn(true);
      } else {
        setError("帳號或密碼不正確。Demo 教師：teacher@example.com / teacher123；Admin：admin@example.com / admin123");
      }
      return;
    }

    const result = await signInStaff(email, password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setProfile(result.profile);
    setRole(result.profile.role);
    setLoggedIn(true);
  }

  async function logout() {
    await signOut();
    setLoggedIn(false);
    setProfile(null);
    setStudents([]);
    setSelectedStudentId(null);
    setLastLoadedAt(null);
  }

  async function loadStudents() {
    if (!loggedIn || !supabaseReady || !supabase) return;
    setLoadingStudents(true);
    const [profilesResult, progressResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("role", "student").order("created_at", { ascending: false }),
      supabase.from("student_app_state").select("student_id, progress, updated_at")
    ]);

    if (profilesResult.error || progressResult.error) {
      setError(profilesResult.error?.message || progressResult.error?.message || "讀取學生資料失敗。");
      setLoadingStudents(false);
      return;
    }

    const progressMap = new Map<string, { progress: StudentProgress; updated_at: string }>();
    (progressResult.data || []).forEach((item: any) => progressMap.set(item.student_id, { progress: item.progress, updated_at: item.updated_at }));
    const rows = (profilesResult.data || []).map((item) => {
      const saved = progressMap.get(item.id);
      return {
        profile: item as Profile,
        progress: saved?.progress || null,
        updated_at: saved?.updated_at || null
      };
    });
    setStudents(rows);
    setLastLoadedAt(new Date().toISOString());
    setLoadingStudents(false);
  }

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, supabaseReady]);

  if (!loggedIn) {
    return (
      <main className="login-page">
        <form
          className="login-card"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            login(String(formData.get("email") || ""), String(formData.get("password") || ""));
          }}
        >
          <p className="eyebrow">Teacher / Admin Login</p>
          <h2>後台登入</h2>
          <p className="muted">老師和 Admin 使用 email + 密碼登入。Supabase 未設定時，可用 demo 帳號預覽後台。</p>
          {!supabaseReady && (
            <div className="notice-box">
              <strong>Supabase 尚未連接</strong>
              <p>正式學生資料需要 Supabase。現在後台會顯示 demo 資料。</p>
            </div>
          )}
          <div className="field">
            <label>帳號 / Email</label>
            <input name="email" type="email" placeholder="teacher@example.com" />
          </div>
          <div className="field">
            <label>密碼</label>
            <input name="password" type="password" placeholder="teacher123" />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn primary full" type="submit">登入後台</button>
        </form>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="side">
        <div className="brand">
          <div className="brand-logo">T</div>
          <div>
            <h1>Teacher Hub</h1>
            <p>{role === "admin" ? "Admin 管理員" : "Teacher 教師"}</p>
          </div>
        </div>
        {profile && (
          <div className="student-chip">
            <span>{profile.role === "admin" ? "A" : "T"}</span>
            <div>
              <strong>{profile.name}</strong>
              <small>{profile.role}</small>
            </div>
          </div>
        )}
        <nav className="nav">
          {(["dashboard", "students", "assignments", "courses", "admin"] as AdminTab[]).map((item) => (
            <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)} disabled={item === "admin" && role !== "admin"}>
              {adminTitle(item)}
            </button>
          ))}
          <button className="btn secondary full" onClick={logout}>登出</button>
          <a className="btn secondary full" href="/">回學生端</a>
        </nav>
      </aside>
      <main className="admin-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Management</p>
            <h2>{adminTitle(tab)}</h2>
          </div>
          {supabaseReady && (
            <div className="admin-actions">
              <button className="btn secondary" onClick={loadStudents} disabled={loadingStudents}>
                {loadingStudents ? "讀取中..." : "重新整理學生資料"}
              </button>
              {lastLoadedAt && <small>最後更新：{new Date(lastLoadedAt).toLocaleTimeString("zh-Hant")}</small>}
            </div>
          )}
        </header>
        {tab === "dashboard" && <Dashboard students={students} loading={loadingStudents} supabaseReady={supabaseReady} />}
        {tab === "students" && (
          <Students
            students={students}
            loading={loadingStudents}
            supabaseReady={supabaseReady}
            selectedStudentId={selectedStudentId}
            onSelectStudent={setSelectedStudentId}
          />
        )}
        {tab === "assignments" && <Assignments students={students} teacher={profile} supabaseReady={supabaseReady} />}
        {tab === "courses" && <Courses teacher={profile} supabaseReady={supabaseReady} />}
        {tab === "admin" && <AdminTools />}
      </main>
    </div>
  );
}

function adminTitle(tab: AdminTab) {
  return {
    dashboard: "Dashboard",
    students: "學生管理",
    assignments: "任務指定",
    courses: "課程內容管理",
    admin: "Admin 管理"
  }[tab];
}

function Dashboard({ students, loading, supabaseReady }: { students: StudentRow[]; loading: boolean; supabaseReady: boolean }) {
  const source = supabaseReady ? students : [];
  const totalStudents = supabaseReady ? source.length : demoStudents.length;
  const completedToday = source.filter((row) => row.updated_at?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
  const averageCompleted = source.length
    ? Math.round(source.reduce((sum, row) => sum + (row.progress?.completedLessons.length || 0), 0) / source.length)
    : 0;

  return (
    <>
      <div className="metric-grid">
        <div className="metric"><strong>{loading ? "..." : totalStudents}</strong><small>學生總數</small></div>
        <div className="metric"><strong>{supabaseReady ? completedToday : 2}</strong><small>今日有進度</small></div>
        <div className="metric"><strong>{supabaseReady ? averageCompleted : 3}</strong><small>平均完成故事</small></div>
        <div className="metric"><strong>{appLessons.length}</strong><small>已發布課程</small></div>
      </div>
      <div className="grid two" style={{ marginTop: 18 }}>
        <article className="panel">
          <h3>學生帳號狀態</h3>
          <p className="muted">
            {supabaseReady
              ? "這裡會顯示 Supabase 中的真實學生帳號和進度。"
              : "目前是 demo 後台。連接 Supabase 後可查看真實學生。"}
          </p>
        </article>
        <article className="panel">
          <h3>最近活動</h3>
          <p className="muted">{source[0]?.updated_at ? `最新更新：${new Date(source[0].updated_at).toLocaleString("zh-Hant")}` : "暫時沒有學生進度。"}</p>
        </article>
      </div>
    </>
  );
}

function skillPercent(progress: StudentProgress | null, skill: "listen" | "speak" | "read" | "write") {
  const answers = progress?.answers.filter((item) => item.skill === skill) || [];
  const correct = answers.filter((item) => item.correct).length;
  const completedCount = Object.values(progress?.completedSkills || {}).filter((skills) => skills.includes(skill)).length;
  if (answers.length) return Math.round((correct / answers.length) * 100);
  return completedCount ? 100 : 0;
}

const teacherSkillLabels: Record<Skill, string> = {
  listen: "聽力",
  speak: "口說",
  read: "閱讀",
  write: "寫作"
};

const reportSkills: Skill[] = ["listen", "speak", "read", "write"];

function lessonReportLessons(progress: StudentProgress | null, baseLessons: Lesson[]) {
  const knownIds = new Set(baseLessons.map((lesson) => lesson.id));
  const dynamicIds = new Set<string>();
  progress?.completedLessons.forEach((id) => dynamicIds.add(id));
  Object.keys(progress?.completedSkills || {}).forEach((id) => dynamicIds.add(id));
  progress?.answers.forEach((answer) => dynamicIds.add(answer.lessonId));

  const extraLessons: Lesson[] = Array.from(dynamicIds)
    .filter((id) => !knownIds.has(id))
    .map((id, index) => ({
      id,
      title: `自訂課程 ${index + 1}`,
      topic: "Teacher Course",
      level: 1,
      cover: "📘",
      pattern: "",
      sentences: [],
      words: [],
      listen: [],
      read: [],
      speak: [],
      write: [],
      sortOrder: 100000 + index
    }));

  return [...baseLessons, ...extraLessons];
}

function lessonReportStatus(progress: StudentProgress | null, lesson: Lesson) {
  const completedSkills = progress?.completedSkills[lesson.id] || [];
  const answers = progress?.answers.filter((answer) => answer.lessonId === lesson.id) || [];
  const wrongAnswers = answers.filter((answer) => !answer.correct);
  const completed = Boolean(progress?.completedLessons.includes(lesson.id));
  return { completedSkills, answers, wrongAnswers, completed };
}

function Students({
  students,
  loading,
  supabaseReady,
  selectedStudentId,
  onSelectStudent
}: {
  students: StudentRow[];
  loading: boolean;
  supabaseReady: boolean;
  selectedStudentId: string | null;
  onSelectStudent: (id: string | null) => void;
}) {
  const [teacherReportLessons, setTeacherReportLessons] = useState<Lesson[]>(appLessons);
  const [studentLevelOverrides, setStudentLevelOverrides] = useState<Record<string, LearningLevel>>({});

  useEffect(() => {
    async function loadTeacherReportLessons() {
      if (!supabaseReady || !supabase) {
        setTeacherReportLessons(appLessons);
        return;
      }
      const { data, error } = await supabase.from("course_drafts").select("*").eq("status", "published");
      if (error) return;
      setTeacherReportLessons(mergePublishedLessons(appLessons, (data || []) as CourseDraft[]));
    }
    loadTeacherReportLessons();
  }, [supabaseReady]);

  async function updateStudentLevel(studentId: string, level: LearningLevel) {
    if (!supabaseReady || !supabase) return;
    setStudentLevelOverrides((current) => ({ ...current, [studentId]: level }));
    const { error } = await supabase
      .from("profiles")
      .update({ proficiency_level: level })
      .eq("id", studentId);
    if (error) {
      setStudentLevelOverrides((current) => {
        const next = { ...current };
        delete next[studentId];
        return next;
      });
      return;
    }
    onSelectStudent(null);
  }

  if (!supabaseReady) {
    return (
      <article className="panel">
        <h3>學生列表 Demo</h3>
        <table className="table">
          <thead><tr><th>學生</th><th>帳號</th><th>完成故事</th><th>弱項</th><th>星星</th></tr></thead>
          <tbody>
            {demoStudents.map((student) => (
              <tr key={student.id}><td>{student.name}</td><td>{student.username}</td><td>{student.completed}</td><td>{student.weak}</td><td>{student.stars}</td></tr>
            ))}
          </tbody>
        </table>
      </article>
    );
  }

  const selected = students.find((row) => row.profile.id === selectedStudentId) || null;
  const mistakes = Object.values(selected?.progress?.mistakes || {}).sort((a, b) => b.count - a.count);
  const reportLessons = lessonReportLessons(selected?.progress || null, teacherReportLessons);
  const unfinishedLessons = reportLessons.filter((lesson) => !selected?.progress?.completedLessons.includes(lesson.id));

  return (
    <>
    <div className="teacher-student-layout">
      <article className="panel">
        <div className="section-title compact">
          <h3>學生列表</h3>
          <span className="pill blue">{students.length} 位學生</span>
        </div>
        {loading ? <p className="muted">載入學生資料中...</p> : (
          <table className="table">
            <thead><tr><th>學生</th><th>帳號</th><th>程度</th><th>完成故事</th><th>星星</th><th>錯題</th><th>操作</th></tr></thead>
            <tbody>
              {students.map((row) => (
                <tr
                  key={row.profile.id}
                  className={selected?.profile.id === row.profile.id ? "selected-row" : ""}
                  onClick={() => onSelectStudent(row.profile.id)}
                >
                  <td>{row.profile.avatar || "⭐"} {row.profile.name}</td>
                  <td>{row.profile.username}</td>
                  <td>
                    <select
                      value={studentLevelOverrides[row.profile.id] || defaultLearningLevel(row.profile.proficiency_level)}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateStudentLevel(row.profile.id, event.target.value as LearningLevel)}
                    >
                      {(["beginner", "intermediate", "advanced"] as LearningLevel[]).map((level) => (
                        <option key={level} value={level}>{learningLevelLabels[level]}</option>
                      ))}
                    </select>
                  </td>
                  <td>{row.progress?.completedLessons.length || 0}</td>
                  <td>{row.progress?.stars || 0}</td>
                  <td>{Object.keys(row.progress?.mistakes || {}).length}</td>
                  <td><button className="btn ghost small-btn" type="button">查看報告</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </div>

    {selected && (
      <div className="student-report-backdrop" role="dialog" aria-modal="true" aria-label={`${selected.profile.name} 的學習報告`}>
        <div className="student-report-page">
          <div className="student-report">
            <div className="section-title compact">
              <div>
                <h3>{selected.profile.avatar || "⭐"} {selected.profile.name} 的學習報告</h3>
                <p className="muted">帳號：{selected.profile.username || "未設定"} · 最後更新：{selected.updated_at ? new Date(selected.updated_at).toLocaleString("zh-Hant") : "尚未同步"}</p>
              </div>
              <button className="btn ghost" type="button" onClick={() => onSelectStudent(null)}>關閉報告</button>
            </div>
            <div className="metric-grid compact-metrics">
              <div className="metric"><strong>{selected.progress?.completedLessons.length || 0}</strong><small>已完成單元</small></div>
              <div className="metric"><strong>{unfinishedLessons.length}</strong><small>未完成單元</small></div>
              <div className="metric"><strong>{selected.progress?.stars || 0}</strong><small>星星</small></div>
              <div className="metric"><strong>{mistakes.length}</strong><small>需跟進錯題</small></div>
            </div>

            <section className="editor-section">
              <div>
                <h4>聽說讀寫能力</h4>
                <p>用真實答題記錄計算。學生只完成但沒有答題時，會顯示為已完成，但不當作滿分。</p>
              </div>
              <div>
                {reportSkills.map((skill) => (
                  <div className="bar-row" key={skill}>
                    <label><span>{teacherSkillLabels[skill]}</span><span>{skillPercent(selected.progress, skill)}%</span></label>
                    <div className="progress"><span style={{ width: `${skillPercent(selected.progress, skill)}%` }} /></div>
                  </div>
                ))}
              </div>
            </section>

            <section className="editor-section">
              <div>
                <h4>單元完成情況</h4>
                <p>每個單元會列出聽、說、讀、寫哪些部分已完成，以及該單元答錯的題目。</p>
              </div>
              <div className="lesson-report-grid">
                {reportLessons.map((lesson) => {
                  const status = lessonReportStatus(selected.progress, lesson);
                  return (
                    <article className="lesson-report-card" key={lesson.id}>
                      <div className="lesson-report-head">
                        <div>
                          <span className="lesson-cover-mini">{lesson.cover}</span>
                          <strong>{lesson.title}</strong>
                          <small>{lesson.topic} · Level {lesson.level}</small>
                        </div>
                        <span className={`pill ${status.completed ? "green" : "blue"}`}>
                          {status.completed ? "已完成" : "未完成"}
                        </span>
                      </div>
                      <div className="skill-chip-row">
                        {reportSkills.map((skill) => (
                          <span
                            className={`skill-chip ${status.completedSkills.includes(skill) ? "done" : "missing"}`}
                            key={skill}
                          >
                            {teacherSkillLabels[skill]} {status.completedSkills.includes(skill) ? "完成" : "未完成"}
                          </span>
                        ))}
                      </div>
                      <div className="answer-summary">
                        <span>答題 {status.answers.length} 題</span>
                        <span>錯題 {status.wrongAnswers.length} 題</span>
                      </div>
                      {status.wrongAnswers.length ? (
                        <div className="answer-list">
                          {status.wrongAnswers.map((answer, index) => (
                            <div className="answer-row" key={`${answer.date}-${index}`}>
                              <strong>{answer.label || teacherSkillLabels[answer.skill]}</strong>
                              <small>{teacherSkillLabels[answer.skill]} · {new Date(answer.date).toLocaleString("zh-Hant")}</small>
                              <p>學生答案：{answer.answer || "未記錄"}</p>
                              <p>正確答案：{answer.correctAnswer || "未記錄"}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="muted no-answer">這個單元暫時沒有錯題記錄。</p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function Assignments({ students, teacher, supabaseReady }: { students: StudentRow[]; teacher: Profile | null; supabaseReady: boolean }) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [lessonId, setLessonId] = useState(appLessons[0].id);
  const [skill, setSkill] = useState<Skill | "all">("all");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [assignments, setAssignments] = useState<AppAssignment[]>([]);
  const [assignableLessons, setAssignableLessons] = useState<Lesson[]>(appLessons);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!selectedStudentIds.length && students[0]) setSelectedStudentIds([students[0].profile.id]);
  }, [selectedStudentIds.length, students]);

  async function loadAssignments() {
    if (!supabaseReady || !supabase) return;
    const { data, error } = await supabase.from("app_assignments").select("*").order("created_at", { ascending: false });
    if (error) {
      setMessage("任務資料表還沒建立，請先執行 teacher-tools-upgrade.sql。");
      return;
    }
    setAssignments((data || []) as AppAssignment[]);
  }

  async function loadAssignableLessons() {
    if (!supabaseReady || !supabase) return;
    const { data, error } = await supabase.from("course_drafts").select("*").eq("status", "published");
    if (error) return;
    const nextLessons = mergePublishedLessons(appLessons, (data || []) as CourseDraft[]);
    setAssignableLessons(nextLessons);
    if (!nextLessons.some((lesson) => lesson.id === lessonId)) {
      setLessonId(nextLessons[0]?.id || appLessons[0].id);
    }
  }

  useEffect(() => {
    loadAssignments();
    loadAssignableLessons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseReady]);

  async function createAssignment() {
    setMessage("");
    if (!supabaseReady || !supabase || !teacher) {
      setMessage("請先使用正式教師帳號登入。");
      return;
    }
    if (!selectedStudentIds.length) {
      setMessage("請先選擇至少一位學生。");
      return;
    }

    const rows = selectedStudentIds.map((studentId) => ({
      teacher_id: teacher.id,
      student_id: studentId,
      lesson_id: lessonId,
      skill,
      due_date: dueDate || null,
      note: note.trim() || null
    }));
    const { error } = await supabase.from("app_assignments").insert(rows);

    if (error) {
      setMessage(error.message.includes("app_assignments") ? "任務資料表還沒建立，請先執行 teacher-tools-upgrade.sql。" : error.message);
      return;
    }

    setMessage(`任務已指定給 ${selectedStudentIds.length} 位學生。`);
    setNote("");
    await loadAssignments();
  }

  const studentName = (id: string) => students.find((row) => row.profile.id === id)?.profile.name || "學生";
  const lessonTitle = (id: string) => assignableLessons.find((lesson) => lesson.id === id)?.title || id;
  const allSelected = students.length > 0 && selectedStudentIds.length === students.length;

  function toggleStudent(id: string) {
    setSelectedStudentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <div className="grid two">
      <article className="panel">
        <h3>指定任務</h3>
        <form className="form" onSubmit={(event) => { event.preventDefault(); createAssignment(); }}>
          <div className="field">
            <label>學生 / 全班</label>
            <div className="check-panel">
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => setSelectedStudentIds(event.target.checked ? students.map((row) => row.profile.id) : [])}
                />
                <span>全選目前所有學生（暫作全班派發）</span>
              </label>
              {students.length ? students.map((s) => (
                <label className="check-row" key={s.profile.id}>
                  <input type="checkbox" checked={selectedStudentIds.includes(s.profile.id)} onChange={() => toggleStudent(s.profile.id)} />
                  <span>{s.profile.avatar || "⭐"} {s.profile.name} · {s.profile.username}</span>
                </label>
              )) : <p className="muted">請先建立學生。</p>}
            </div>
          </div>
          <div className="field">
            <label>課程</label>
            <select value={lessonId} onChange={(event) => setLessonId(event.target.value)}>
              {assignableLessons.map((lesson) => (
                <option key={lesson.id} value={lesson.id}>
                  {learningLevelLabels[lessonDifficulty(lesson)]} · {lesson.title}
                </option>
              ))}
            </select>
            <small>這裡會包含已發布到學生端的自訂課程。</small>
          </div>
          <div className="field">
            <label>技能</label>
            <select value={skill} onChange={(event) => setSkill(event.target.value as Skill | "all")}>
              <option value="all">全部任務</option>
              <option value="listen">聽力</option>
              <option value="speak">口說</option>
              <option value="read">閱讀</option>
              <option value="write">寫作</option>
            </select>
          </div>
          <div className="field"><label>截止日期</label><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>
          <div className="field"><label>老師備註</label><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="例如：今天完成聽力和閱讀" /></div>
          {message && <p className={message.includes("已指定") ? "success-text" : "form-error"}>{message}</p>}
          <button className="btn primary" type="submit" disabled={!students.length || !selectedStudentIds.length}>建立指定任務</button>
        </form>
      </article>

      <article className="panel">
        <div className="section-title compact">
          <h3>已指定任務</h3>
          <button className="btn secondary" onClick={loadAssignments}>重新整理</button>
        </div>
        {assignments.length ? assignments.map((item) => (
          <div className="assignment-row" key={item.id}>
            <strong>{studentName(item.student_id)}：{lessonTitle(item.lesson_id)}</strong>
            <small>{item.skill === "all" ? "全部任務" : item.skill} · {item.due_date || "無截止日期"} · {item.status}</small>
            {item.note && <p className="muted">{item.note}</p>}
          </div>
        )) : <p className="muted">暫時沒有指定任務。</p>}
      </article>
    </div>
  );
}

function Courses({ teacher, supabaseReady }: { teacher: Profile | null; supabaseReady: boolean }) {
  const totalWords = useMemo(() => appLessons.reduce((sum, lesson) => sum + lesson.words.length, 0), []);
  const [drafts, setDrafts] = useState<CourseDraft[]>([]);
  const [view, setView] = useState<"list" | "editor">("list");
  const [sourceLessonId, setSourceLessonId] = useState(appLessons[0].id);
  const [editingId, setEditingId] = useState("");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState(1);
  const [difficulty, setDifficulty] = useState<LearningLevel>("beginner");
  const [cover, setCover] = useState("📘");
  const [pattern, setPattern] = useState("I see a ____.");
  const [sentencesText, setSentencesText] = useState("");
  const [wordsText, setWordsText] = useState("");
  const [listenText, setListenText] = useState("");
  const [readText, setReadText] = useState("");
  const [speakText, setSpeakText] = useState("");
  const [writeText, setWriteText] = useState("");
  const [positionMode, setPositionMode] = useState<"end" | "beginning" | "after">("end");
  const [positionAfterLessonId, setPositionAfterLessonId] = useState(appLessons[0].id);
  const [unlockMode, setUnlockMode] = useState<"open" | "previous" | "specific">("open");
  const [prerequisiteLessonId, setPrerequisiteLessonId] = useState(appLessons[0].id);
  const [message, setMessage] = useState("");
  const [aiTopic, setAiTopic] = useState("school");

  function loadLessonTemplate(lesson = appLessons.find((item) => item.id === sourceLessonId) || appLessons[0]) {
    setEditingId(lesson.id);
    setTitle(lesson.title);
    setTopic(lesson.topic);
    setLevel(lesson.level);
    setDifficulty(lessonDifficulty(lesson));
    setCover(lesson.cover);
    setPattern(lesson.pattern);
    setSentencesText(lesson.sentences.map((item) => `${item.en} | ${item.zh} | ${item.image}`).join("\n"));
    setWordsText(lesson.words.map((item) => `${item.word} | ${item.meaning} | ${item.part} | ${item.image} | ${item.example} | ${item.translation} | ${item.level}`).join("\n"));
    setListenText(lesson.listen.map((item) => `${item.prompt} | ${item.answer} | ${item.options.join(", ")} | ${item.audio || ""}`).join("\n"));
    setReadText(lesson.read.map((item) => `${item.prompt} | ${item.answer} | ${item.options.join(", ")}`).join("\n"));
    setSpeakText(lesson.speak.map((item) => `${item.prompt} | ${item.target}`).join("\n"));
    setWriteText(lesson.write.map((item) => `${item.prompt} | ${item.starter} | ${item.answerHint}`).join("\n"));
    setPositionMode("after");
    setPositionAfterLessonId(lesson.id);
    setUnlockMode(lesson.id === appLessons[0].id ? "open" : "previous");
    setPrerequisiteLessonId(lesson.id);
    setMessage("已載入現有課程，可修改後儲存為草稿。");
    setView("editor");
  }

  async function loadDrafts() {
    if (!supabaseReady || !supabase) return [];
    const { data, error } = await supabase.from("course_drafts").select("*").order("updated_at", { ascending: false });
    if (error) {
      setMessage(error.message.includes("course_drafts") ? "課程草稿資料表還沒建立，請先執行 teacher-tools-upgrade.sql。" : `讀取課程失敗：${error.message}`);
      return [];
    }
    const nextDrafts = (data || []) as CourseDraft[];
    setDrafts(nextDrafts);
    return nextDrafts;
  }

  useEffect(() => {
    loadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabaseReady]);

  function editDraft(draft: CourseDraft) {
    setEditingId(draft.id);
    setTitle(draft.title);
    setTopic(draft.topic);
    setLevel(draft.level);
    setCover(draft.cover);
    setPattern(draft.pattern);
    const content = draft.content as any;
    setDifficulty(defaultLearningLevel(content.difficulty));
    setSentencesText(content.sentencesText || "");
    setWordsText(content.wordsText || "");
    setListenText(content.listenText || "");
    setReadText(content.readText || "");
    setSpeakText(content.speakText || "");
    setWriteText(content.writeText || "");
    setPositionMode("end");
    setPositionAfterLessonId(String(content.positionAfterLessonId || appLessons[0].id));
    setUnlockMode((content.unlockMode as "open" | "previous" | "specific") || "open");
    setPrerequisiteLessonId(String(content.prerequisiteLessonId || appLessons[0].id));
    setMessage("");
    setView("editor");
  }

  function resetDraftForm() {
    setEditingId("");
    setTitle("");
    setTopic("");
    setLevel(1);
    setDifficulty("beginner");
    setCover("📘");
    setPattern("I see a ____.");
    setSentencesText("");
    setWordsText("");
    setListenText("");
    setReadText("");
    setSpeakText("");
    setWriteText("");
    setPositionMode("end");
    setPositionAfterLessonId(appLessons[0].id);
    setUnlockMode("open");
    setPrerequisiteLessonId(appLessons[0].id);
  }

  function newBlankCourse() {
    setEditingId("");
    setTitle("My New Story");
    setTopic("Daily Life");
    setLevel(1);
    setDifficulty("beginner");
    setCover("📘");
    setPattern("I can ____.");
    setSentencesText([
      "Today is a sunny day. | 今天是晴朗的一天。 | ☀️",
      "I see my friend at school. | 我在學校看到我的朋友。 | 🏫",
      "We read a book together. | 我們一起讀一本書。 | 📖",
      "I can say the new words. | 我會說新的單字。 | 🗣️",
      "We are happy today. | 我們今天很開心。 | 😊"
    ].join("\n"));
    setWordsText([
      "sunny | 晴朗的 | adjective | ☀️ | It is sunny today. | 今天是晴朗的。 | Level 1",
      "friend | 朋友 | noun | 🧑‍🤝‍🧑 | I see my friend. | 我看到我的朋友。 | Level 1",
      "school | 學校 | noun | 🏫 | I go to school. | 我去學校。 | Level 1",
      "read | 閱讀 | verb | 📖 | I read a book. | 我讀一本書。 | Level 1",
      "say | 說 | verb | 🗣️ | I can say it. | 我會說它。 | Level 1",
      "happy | 開心的 | adjective | 😊 | I am happy. | 我很開心。 | Level 1"
    ].join("\n"));
    setListenText([
      "聽單字，選出正確意思：sunny | 晴朗的 | 晴朗的, 傷心的, 大的, 跳 | sunny",
      "聽句子，選出你聽到的句子 | I read a book. | I read a book., I eat lunch., I see a zoo. | I read a book."
    ].join("\n"));
    setReadText([
      "Where do I see my friend? | school | school, zoo, park, home",
      "What do we read together? | book | book, ball, cake, bag"
    ].join("\n"));
    setSpeakText([
      "跟讀單字 | sunny",
      "跟讀句子 | I read a book.",
      "看圖說一句 | I can say the new words."
    ].join("\n"));
    setWriteText([
      "完成句子 | I can ____. | read",
      "替換單字造句 | I see my ____. | friend",
      "寫一句自己的句子 | I am ____. | happy"
    ].join("\n"));
    setPositionMode("end");
    setPositionAfterLessonId(appLessons[0].id);
    setUnlockMode("open");
    setPrerequisiteLessonId(appLessons[0].id);
    setMessage("已建立完整課程模板，請按區塊修改後儲存或發布。");
    setView("editor");
  }

  function generateAiCourseContent() {
    buildSimpleAiCourse(aiTopic || topic || "school");
  }

  async function saveDraft(nextStatus: "draft" | "published" = "draft") {
    setMessage("");
    if (!supabaseReady || !supabase || !teacher) {
      setMessage("請先使用正式教師帳號登入。");
      return;
    }
    if (!title.trim() || !topic.trim()) {
      setMessage("請輸入課程名稱和主題。");
      return;
    }
    const id = editingId || title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `course-${Date.now()}`;
    const sortOrder = calculateSortOrder(id);
    const payload = {
      id,
      title: title.trim(),
      topic: topic.trim(),
      level,
      cover,
      pattern,
      status: nextStatus,
      content: {
        sentencesText,
        wordsText,
        listenText,
        readText,
        speakText,
        writeText,
        difficulty,
        sortOrder,
        positionMode,
        positionAfterLessonId,
        unlockMode,
        prerequisiteLessonId: unlockMode === "specific" ? prerequisiteLessonId : ""
      },
      updated_by: teacher.id,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabase
      .from("course_drafts")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();
    if (error) {
      setMessage(error.message.includes("course_drafts") ? "課程草稿資料表還沒建立，請先執行 teacher-tools-upgrade.sql。" : `儲存失敗：${error.message}`);
      return;
    }
    setMessage(nextStatus === "published" ? "課程已發布到學生端。" : "課程草稿已儲存。");
    if (data) {
      const savedDraft = data as CourseDraft;
      setDrafts((current) => [savedDraft, ...current.filter((item) => item.id !== savedDraft.id)]);
    }
    resetDraftForm();
    await loadDrafts();
    setView("list");
  }

  async function deleteDraft(id: string) {
    if (!supabaseReady || !supabase) return;
    const confirmed = window.confirm("確定要刪除這個自訂課程草稿嗎？刪除後學生端也不會再看到這個發布課程。");
    if (!confirmed) return;
    await supabase.from("course_drafts").delete().eq("id", id);
    await loadDrafts();
  }

  async function setDraftStatus(id: string, status: "draft" | "published") {
    if (!supabaseReady || !supabase) return;
    const { error } = await supabase
      .from("course_drafts")
      .update({ status, updated_at: new Date().toISOString(), updated_by: teacher?.id || null })
      .eq("id", id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(status === "published" ? "課程已發布到學生端。" : "課程已下架，學生端不會顯示。");
    await loadDrafts();
  }

  const draftMap = new Map(drafts.map((draft) => [draft.id, draft]));
  const builtinRows = appLessons.map((lesson) => {
    const draft = draftMap.get(lesson.id);
    const content = (draft?.content || {}) as any;
    const fallbackOrder = (appLessons.findIndex((item) => item.id === lesson.id) + 1) * 1000;
    return {
      id: lesson.id,
      title: draft?.title || lesson.title,
      topic: draft?.topic || lesson.topic,
      level: draft?.level || lesson.level,
      difficulty: defaultLearningLevel(content.difficulty || lessonDifficulty(lesson)),
      cover: draft?.cover || lesson.cover,
      words: draft ? countFilledLines((draft.content as any)?.wordsText) : lesson.words.length,
      status: draft ? (draft.status === "published" ? "已發布自訂版" : "草稿覆蓋中") : "內建已發布",
      source: "內建課程",
      sortOrder: Number(content.sortOrder || fallbackOrder),
      unlockMode: (content.unlockMode as "open" | "previous" | "specific") || (lesson.id === appLessons[0].id ? "open" : "previous"),
      prerequisiteLessonId: String(content.prerequisiteLessonId || ""),
      draft,
      lesson,
      canDelete: false
    };
  });
  const customRows = drafts
    .filter((draft) => !appLessons.some((lesson) => lesson.id === draft.id))
    .map((draft) => ({
      ...(draft.content as any),
      id: draft.id,
      title: draft.title,
      topic: draft.topic,
      level: draft.level,
      difficulty: defaultLearningLevel((draft.content as any)?.difficulty || "beginner"),
      cover: draft.cover,
      words: countFilledLines((draft.content as any)?.wordsText),
      status: draft.status === "published" ? "已發布到學生端" : "草稿",
      source: "自訂課程",
      sortOrder: Number((draft.content as any)?.sortOrder || 999000),
      unlockMode: ((draft.content as any)?.unlockMode as "open" | "previous" | "specific") || "open",
      prerequisiteLessonId: String((draft.content as any)?.prerequisiteLessonId || ""),
      draft,
      lesson: null,
      canDelete: true
    }));
  const courseRows = [...builtinRows, ...customRows].sort((a, b) => a.sortOrder - b.sortOrder);
  const courseOptions = courseRows.map((row) => ({ id: row.id, title: row.title, order: row.sortOrder }));

  function countFilledLines(value?: string) {
    return (value || "").split("\n").filter((line) => line.trim()).length;
  }

  function buildSimpleAiCourse(topicKey: string) {
    const packs: Record<string, { title: string; topic: string; cover: string; words: [string, string, string, string, string, string][] }> = {
      school: {
        title: "A Busy School Day",
        topic: "School",
        cover: "🏫",
        words: [
          ["classroom", "教室", "noun", "🏫", "I am in the classroom.", "我在教室裡。"],
          ["book", "書", "noun", "📘", "I read a book.", "我讀一本書。"],
          ["pencil", "鉛筆", "noun", "✏️", "I have a pencil.", "我有一支鉛筆。"],
          ["write", "寫", "verb", "📝", "I write a sentence.", "我寫一個句子。"],
          ["teacher", "老師", "noun", "👩‍🏫", "The teacher helps me.", "老師幫助我。"],
          ["practice", "練習", "verb", "🎯", "I practice English.", "我練習英文。"]
        ]
      },
      food: {
        title: "My Tasty Lunch",
        topic: "Food",
        cover: "🍱",
        words: [
          ["lunch", "午餐", "noun", "🍱", "I eat lunch.", "我吃午餐。"],
          ["rice", "米飯", "noun", "🍚", "I like rice.", "我喜歡米飯。"],
          ["egg", "雞蛋", "noun", "🥚", "This is an egg.", "這是一顆雞蛋。"],
          ["milk", "牛奶", "noun", "🥛", "I drink milk.", "我喝牛奶。"],
          ["share", "分享", "verb", "🤝", "I share my food.", "我分享我的食物。"],
          ["sweet", "甜的", "adjective", "🍪", "The cookie is sweet.", "餅乾是甜的。"]
        ]
      },
      animals: {
        title: "A Funny Animal Show",
        topic: "Animals",
        cover: "🦁",
        words: [
          ["zoo", "動物園", "noun", "🏞️", "I go to the zoo.", "我去動物園。"],
          ["lion", "獅子", "noun", "🦁", "The lion is big.", "獅子很大。"],
          ["monkey", "猴子", "noun", "🐵", "The monkey can jump.", "猴子會跳。"],
          ["jump", "跳", "verb", "⬆️", "I can jump.", "我會跳。"],
          ["funny", "有趣的", "adjective", "😄", "The monkey is funny.", "猴子很有趣。"],
          ["watch", "觀看", "verb", "👀", "I watch the animals.", "我看動物。"]
        ]
      },
      family: {
        title: "Helping My Family",
        topic: "Family",
        cover: "👨‍👩‍👧",
        words: [
          ["family", "家庭", "noun", "👨‍👩‍👧", "I love my family.", "我愛我的家庭。"],
          ["mom", "媽媽", "noun", "👩", "Mom cooks dinner.", "媽媽煮晚餐。"],
          ["dad", "爸爸", "noun", "👨", "Dad reads a story.", "爸爸讀故事。"],
          ["help", "幫助", "verb", "🤝", "I help at home.", "我在家幫忙。"],
          ["clean", "清潔", "verb", "🧹", "I clean the table.", "我清潔桌子。"],
          ["kind", "親切的", "adjective", "💛", "My family is kind.", "我的家人很親切。"]
        ]
      },
      feelings: {
        title: "My Brave Feeling",
        topic: "Feelings",
        cover: "😊",
        words: [
          ["happy", "開心的", "adjective", "😊", "I am happy.", "我很開心。"],
          ["nervous", "緊張的", "adjective", "😬", "I feel nervous.", "我感到緊張。"],
          ["brave", "勇敢的", "adjective", "🦸", "I can be brave.", "我可以很勇敢。"],
          ["smile", "微笑", "verb", "🙂", "I smile at my friend.", "我對朋友微笑。"],
          ["try", "嘗試", "verb", "🎯", "I try again.", "我再試一次。"],
          ["better", "更好的", "adjective", "🌈", "I feel better.", "我感覺好多了。"]
        ]
      },
      daily: {
        title: "My Little Daily Plan",
        topic: "Daily Life",
        cover: "🌞",
        words: [
          ["morning", "早上", "noun", "🌞", "It is morning.", "現在是早上。"],
          ["plan", "計劃", "noun", "📝", "I make a plan.", "我制定一個計劃。"],
          ["walk", "走路", "verb", "🚶", "I walk to school.", "我走路去學校。"],
          ["play", "玩", "verb", "⚽", "I play after class.", "我下課後玩。"],
          ["finish", "完成", "verb", "✅", "I finish my work.", "我完成我的作業。"],
          ["tired", "累的", "adjective", "😴", "I am tired.", "我很累。"]
        ]
      }
    };
    const pack = packs[topicKey] || packs.school;
    const action = pack.words.find((word) => word[2] === "verb") || pack.words[3];
    const adjective = pack.words.find((word) => word[2] === "adjective") || pack.words[5];
    const story = difficulty === "advanced"
      ? [
        `Today I have a plan about ${pack.topic.toLowerCase()}. | 今天我有一個關於${pack.topic}的計劃。 | ${pack.cover}`,
        `I use my ${pack.words[2][0]} and try to ${action[0]} carefully. | 我使用我的${pack.words[2][1]}，並仔細嘗試${action[1]}。 | ${pack.words[2][3]}`,
        `At first, I feel ${adjective[0]}, but I keep practicing. | 一開始我覺得${adjective[1]}，但我繼續練習。 | ${adjective[3]}`,
        "Small steps help me learn more English. | 小小的步驟幫助我學更多英文。 | ⭐",
        "I learned that practice can make me better. | 我學到練習可以讓我更進步。 | 🌈"
      ]
      : difficulty === "intermediate"
        ? [
          `I learn about ${pack.topic.toLowerCase()} today. | 我今天學習${pack.topic}。 | ${pack.cover}`,
          `I see a ${pack.words[0][0]} and a ${pack.words[1][0]}. | 我看到${pack.words[0][1]}和${pack.words[1][1]}。 | ${pack.words[0][3]}`,
          `I try to ${action[0]} with my friend. | 我嘗試和朋友一起${action[1]}。 | ${action[3]}`,
          `It is a ${adjective[0]} day. | 這是${adjective[1]}的一天。 | ${adjective[3]}`,
          "I can tell the story in English. | 我可以用英文說這個故事。 | 🗣️"
        ]
        : [
          `I see a ${pack.words[0][0]}. | 我看到${pack.words[0][1]}。 | ${pack.words[0][3]}`,
          `This is my ${pack.words[1][0]}. | 這是我的${pack.words[1][1]}。 | ${pack.words[1][3]}`,
          `I can ${action[0]}. | 我會${action[1]}。 | ${action[3]}`,
          `I am ${adjective[0]}. | 我很${adjective[1]}。 | ${adjective[3]}`
        ];
    const meaningOptions = pack.words.slice(0, 4).map((word) => word[1]).join(", ");
    const wordOptions = pack.words.slice(0, 4).map((word) => word[0]).join(", ");
    setTitle(title.trim() || pack.title);
    setTopic(pack.topic);
    setCover(pack.cover);
    setPattern(difficulty === "advanced" ? "I learned that ____." : difficulty === "intermediate" ? "I can ____ because it helps me." : "I can ____.");
    setSentencesText(story.join("\n"));
    setWordsText(pack.words.map((word, index) => `${word.join(" | ")} | Level ${Math.min(level + (index > 3 ? 1 : 0), 6)}`).join("\n"));
    setListenText([
      `聽單字，選出正確意思：${pack.words[0][0]} | ${pack.words[0][1]} | ${meaningOptions} | ${pack.words[0][0]}`,
      `聽句子，選出你聽到的句子 | ${pack.words[0][4]} | ${pack.words.slice(0, 4).map((word) => word[4]).join(", ")} | ${pack.words[0][4]}`,
      `聽故事，選出重要動作 | ${action[0]} | ${wordOptions} | ${story.map((line) => line.split(" | ")[0]).join(" ")}`
    ].join("\n"));
    setReadText([
      `Which word means「${pack.words[0][1]}」? | ${pack.words[0][0]} | ${wordOptions}`,
      `Which sentence is about "${action[0]}"? | ${action[4]} | ${pack.words.slice(0, 4).map((word) => word[4]).join(", ")}`,
      difficulty === "advanced" ? "What is the main idea? | Practice can make me better. | Practice can make me better., Lunch is sweet., The bag is lost., The zoo is closed." : `Which feeling word appears in the story? | ${adjective[0]} | ${wordOptions}`,
      difficulty === "advanced" ? `Choose the correct grammar sentence. | I can ${action[0]}. | I can ${action[0]}., I cans ${action[0]}., I can ${action[0]}s., I can to ${action[0]}.` : `Where is the story topic? | ${pack.topic} | ${pack.topic}, Weather, Sports, Music`
    ].join("\n"));
    setSpeakText([
      `跟讀單字 | ${pack.words[0][0]}`,
      `跟讀單字 | ${action[0]}`,
      `跟讀句子 | ${pack.words[0][4]}`,
      `看圖說一句 | I can ${action[0]}.`
    ].join("\n"));
    setWriteText([
      `完成句子 | I can ____. | ${action[0]}`,
      `寫出故事中的重要細節 | I learn about ____. | ${pack.topic.toLowerCase()}`,
      difficulty === "advanced" ? "語法填空 | Practice can ____ me better. | make" : `替換單字造句 | I see my ____. | ${pack.words[1][0]}`
    ].join("\n"));
    setMessage("AI 已生成完整課程草稿。請先預覽和修改，再儲存或發布。");
  }

  function openCourseEditor(row: (typeof courseRows)[number]) {
    if (row.draft) {
      editDraft(row.draft);
      return;
    }
    if (row.lesson) {
      setSourceLessonId(row.lesson.id);
      loadLessonTemplate(row.lesson);
    }
  }

  function calculateSortOrder(currentId: string) {
    const otherRows = courseRows.filter((row) => row.id !== currentId);
    const currentRow = courseRows.find((row) => row.id === currentId);
    if (positionMode === "beginning") {
      return Math.min(0, ...otherRows.map((row) => row.sortOrder)) - 100;
    }
    if (positionMode === "after") {
      if (positionAfterLessonId === currentId && currentRow) return currentRow.sortOrder;
      const selected = otherRows.find((row) => row.id === positionAfterLessonId);
      return (selected?.sortOrder || 0) + 50;
    }
    return Math.max(0, ...otherRows.map((row) => row.sortOrder)) + 100;
  }

  function unlockLabel(row: { unlockMode: "open" | "previous" | "specific"; prerequisiteLessonId: string }) {
    if (row.unlockMode === "open") return "立即開放";
    if (row.unlockMode === "specific") {
      return `完成指定課程：${courseRows.find((item) => item.id === row.prerequisiteLessonId)?.title || "未指定"}`;
    }
    return "完成上一課後開放";
  }

  if (view === "editor") {
    return (
      <div className="course-editor">
        <article className="panel">
          <div className="course-editor-head">
            <div>
              <p className="eyebrow">Course Builder</p>
              <h3>{editingId ? "編輯課程單元" : "新增課程單元"}</h3>
              <p className="muted">完整填寫故事、單字、聽說讀寫任務。按「儲存並發布」後，學生端課程地圖會看到這個課程。</p>
            </div>
            <button className="btn secondary" type="button" onClick={() => { resetDraftForm(); setMessage(""); setView("list"); }}>返回課程列表</button>
          </div>

          <div className="template-actions">
            <div className="field">
              <label>用現有課程作為模板</label>
              <div className="inline-controls">
                <select value={sourceLessonId} onChange={(event) => setSourceLessonId(event.target.value)}>
                  {appLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
                </select>
                <button className="btn secondary" type="button" onClick={() => loadLessonTemplate()}>載入模板</button>
              </div>
            </div>
            <div className="field ai-course-box">
              <label>AI 生成課程內容</label>
              <div className="inline-controls">
                <select value={aiTopic} onChange={(event) => setAiTopic(event.target.value)}>
                  <option value="school">School 學校</option>
                  <option value="food">Food 食物</option>
                  <option value="family">Family 家庭</option>
                  <option value="animals">Animals 動物</option>
                  <option value="feelings">Feelings 感受</option>
                  <option value="daily">Daily Life 生活</option>
                </select>
                <button className="btn ghost" type="button" onClick={generateAiCourseContent}>AI 生成完整草稿</button>
              </div>
              <small>會生成故事、單字、聽力、閱讀、口說、寫作。發布前仍可人工修改。</small>
            </div>
          </div>

          <form className="course-form" onSubmit={(event) => { event.preventDefault(); saveDraft("draft"); }}>
            <section className="editor-section">
              <div>
                <h4>1. 課程基本資料</h4>
                <p className="muted">學生會在課程地圖看到這些資訊。</p>
              </div>
              <div className="form-grid">
                <div className="field"><label>課程名稱</label><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：At the Park" /></div>
                <div className="field"><label>主題</label><input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="例如：Nature / School / Food" /></div>
                <div className="field"><label>Level</label><input type="number" min={1} max={6} value={level} onChange={(event) => setLevel(Number(event.target.value))} /></div>
                <div className="field">
                  <label>適用程度</label>
                  <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as LearningLevel)}>
                    {(["beginner", "intermediate", "advanced"] as LearningLevel[]).map((item) => (
                      <option key={item} value={item}>{learningLevelLabels[item]}</option>
                    ))}
                  </select>
                </div>
                <div className="field"><label>封面圖示</label><input value={cover} onChange={(event) => setCover(event.target.value)} placeholder="例如：📘" /></div>
                <div className="field span-2"><label>核心句型</label><input value={pattern} onChange={(event) => setPattern(event.target.value)} placeholder="例如：I can ____." /></div>
              </div>
            </section>

            <section className="editor-section">
              <div>
                <h4>2. 發布與解鎖規則</h4>
                <p className="muted">決定課程在學生地圖的位置，以及學生什麼時候可以開始。</p>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>課程顯示位置</label>
                  <select value={positionMode} onChange={(event) => setPositionMode(event.target.value as "end" | "beginning" | "after")}>
                    <option value="end">放到課程列表最後</option>
                    <option value="beginning">放到課程列表最前</option>
                    <option value="after">放在指定課程後面</option>
                  </select>
                </div>
                <div className="field">
                  <label>指定放在哪一課後面</label>
                  <select value={positionAfterLessonId} onChange={(event) => setPositionAfterLessonId(event.target.value)} disabled={positionMode !== "after"}>
                    {courseOptions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>學生解鎖方式</label>
                  <select value={unlockMode} onChange={(event) => setUnlockMode(event.target.value as "open" | "previous" | "specific")}>
                    <option value="open">立即開放，不需要先完成其他課程</option>
                    <option value="previous">完成上一課後開放</option>
                    <option value="specific">完成指定課程後開放</option>
                  </select>
                </div>
                <div className="field">
                  <label>指定前置課程</label>
                  <select value={prerequisiteLessonId} onChange={(event) => setPrerequisiteLessonId(event.target.value)} disabled={unlockMode !== "specific"}>
                    {courseOptions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                  </select>
                </div>
                <p className="muted span-2">建議：主線課用「完成上一課後開放」；節日、補充或老師派發任務用「立即開放」；複習課用「完成指定課程後開放」。</p>
              </div>
            </section>

            <section className="editor-section">
              <div>
                <h4>3. 迷你故事</h4>
                <p className="muted">建議 4 至 6 句，每句包含英文、中文和圖示。</p>
              </div>
              <div className="field">
                <label>格式：英文 | 中文 | 圖示</label>
                <textarea rows={7} value={sentencesText} onChange={(event) => setSentencesText(event.target.value)} />
                <small>例：I see a monkey. | 我看到一隻猴子。 | 🐵</small>
              </div>
            </section>

            <section className="editor-section">
              <div>
                <h4>4. 單字卡</h4>
                <p className="muted">建議 6 至 10 個單字，包含詞性、例句和中文翻譯。</p>
              </div>
              <div className="field">
                <label>格式：word | 中文 | 詞性 | 圖示 | 例句 | 翻譯 | Level</label>
                <textarea rows={8} value={wordsText} onChange={(event) => setWordsText(event.target.value)} />
                <small>例：monkey | 猴子 | noun | 🐵 | The monkey can jump. | 猴子會跳。 | Level 1</small>
              </div>
            </section>

            <section className="editor-section">
              <div>
                <h4>5. 聽力任務</h4>
                <p className="muted">可以放聽單字、聽句子、聽故事後選答案。</p>
              </div>
              <div className="field">
                <label>格式：題目 | 答案 | 選項1, 選項2, 選項3, 選項4 | 音訊文字</label>
                <textarea rows={6} value={listenText} onChange={(event) => setListenText(event.target.value)} />
                <small>例：聽句子，選出你聽到的句子 | I see a monkey. | I see a monkey., I eat rice., I am happy. | I see a monkey.</small>
              </div>
            </section>

            <section className="editor-section">
              <div>
                <h4>6. 閱讀任務</h4>
                <p className="muted">讓學生根據故事理解內容。</p>
              </div>
              <div className="field">
                <label>格式：題目 | 答案 | 選項1, 選項2, 選項3, 選項4</label>
                <textarea rows={6} value={readText} onChange={(event) => setReadText(event.target.value)} />
              </div>
            </section>

            <section className="editor-section">
              <div>
                <h4>7. 口說任務</h4>
                <p className="muted">安排跟讀、替換句型、看圖說話。</p>
              </div>
              <div className="field">
                <label>格式：提示 | 目標句</label>
                <textarea rows={5} value={speakText} onChange={(event) => setSpeakText(event.target.value)} />
              </div>
            </section>

            <section className="editor-section">
              <div>
                <h4>8. 寫作任務</h4>
                <p className="muted">由填空到造句，逐步降低難度。</p>
              </div>
              <div className="field">
                <label>格式：提示 | 開頭句 | 答案提示</label>
                <textarea rows={5} value={writeText} onChange={(event) => setWriteText(event.target.value)} />
              </div>
            </section>

            {message && <p className={message.includes("已") ? "success-text" : "form-error"}>{message}</p>}
            <div className="sticky-actions">
              <button className="btn secondary" type="button" onClick={() => { resetDraftForm(); setView("list"); }}>取消</button>
              <button className="btn ghost" type="submit">{editingId ? "儲存草稿" : "新增草稿"}</button>
              <button className="btn primary" type="button" onClick={() => saveDraft("published")}>儲存並發布到學生端</button>
            </div>
          </form>
        </article>
      </div>
    );
  }

  return (
    <div className="grid">
      <article className="panel course-list-panel">
        <div className="section-title compact">
          <div>
            <h3>課程內容管理</h3>
            <p className="muted">管理學生端會看到的課程。內建課程可編輯成自訂版本，自訂課程可發布、下架或刪除。</p>
          </div>
          <div className="admin-actions">
            <button className="btn secondary" type="button" onClick={loadDrafts}>重新讀取</button>
            <button className="btn primary" type="button" onClick={newBlankCourse}>新增課程單元</button>
          </div>
        </div>
        <table className="table">
          <thead><tr><th>排序</th><th>課程</th><th>主題</th><th>程度</th><th>Level</th><th>單字</th><th>解鎖方式</th><th>狀態</th><th>操作</th></tr></thead>
          <tbody>
            {courseRows.map((row, index) => (
              <tr key={row.id}>
                <td>{index + 1}</td>
                <td><strong>{row.cover} {row.title}</strong><small>{row.source}</small></td>
                <td>{row.topic}</td>
                <td><span className="pill">{learningLevelLabels[defaultLearningLevel(row.difficulty)]}</span></td>
                <td>{row.level}</td>
                <td>{row.words}</td>
                <td>{unlockLabel(row)}</td>
                <td><span className="pill blue">{row.status}</span></td>
                <td>
                  <div className="course-table-actions">
                    <button className="btn secondary" type="button" onClick={() => openCourseEditor(row)}>編輯</button>
                    {row.draft && (
                      <button className="btn ghost" type="button" onClick={() => setDraftStatus(row.draft!.id, row.draft!.status === "published" ? "draft" : "published")}>
                        {row.draft.status === "published" ? "下架" : "發布"}
                      </button>
                    )}
                    <button className="btn ghost" type="button" disabled={!row.canDelete} onClick={() => row.draft && deleteDraft(row.draft.id)}>
                      刪除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="course-list-footer">
          <button className="btn primary" type="button" onClick={newBlankCourse}>新增課程單元</button>
          <p className="muted">目前共有 {courseRows.length} 個課程，內建 {appLessons.length} 課，約 {totalWords} 個內建單字。</p>
        </div>
        {message && <p className={message.includes("已") ? "success-text" : "form-error"}>{message}</p>}
      </article>
    </div>
  );
}

function AdminTools() {
  return (
    <div className="grid cards">
      {["管理教師帳號", "管理學生帳號", "匯出 CSV 報告", "管理 QR Code", "系統設定"].map((item) => (
        <article className="card" key={item}>
          <h3>{item}</h3>
          <p className="muted">下一階段會加入建立學生帳號、重設密碼與報告匯出。</p>
          <button className="btn secondary" disabled>下一階段開啟</button>
        </article>
      ))}
    </div>
  );
}
