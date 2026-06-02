"use client";

import { useEffect, useMemo, useState } from "react";
import { appLessons } from "@/data/lessons";
import { isSupabaseReady, signInStaff, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { AppAssignment, CourseDraft, Profile, Skill, StudentProgress, UserRole } from "@/lib/types";

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
  if (!answers.length) return 0;
  return Math.round((answers.filter((item) => item.correct).length / answers.length) * 100);
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

  const selected = students.find((row) => row.profile.id === selectedStudentId) || students[0] || null;
  const mistakes = Object.values(selected?.progress?.mistakes || {}).sort((a, b) => b.count - a.count);

  return (
    <div className="grid two teacher-student-layout">
      <article className="panel">
        <h3>學生列表</h3>
        {loading ? <p className="muted">載入學生資料中...</p> : (
          <table className="table">
            <thead><tr><th>學生</th><th>帳號</th><th>完成故事</th><th>星星</th><th>錯題</th><th>最後更新</th></tr></thead>
            <tbody>
              {students.map((row) => (
                <tr
                  key={row.profile.id}
                  className={selected?.profile.id === row.profile.id ? "selected-row" : ""}
                  onClick={() => onSelectStudent(row.profile.id)}
                >
                  <td>{row.profile.avatar || "⭐"} {row.profile.name}</td>
                  <td>{row.profile.username}</td>
                  <td>{row.progress?.completedLessons.length || 0}</td>
                  <td>{row.progress?.stars || 0}</td>
                  <td>{Object.keys(row.progress?.mistakes || {}).length}</td>
                  <td>{row.updated_at ? new Date(row.updated_at).toLocaleString("zh-Hant") : "尚未開始"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>

      <aside className="panel student-detail-panel">
        {selected ? (
          <>
            <div className="section-title compact">
              <h3>{selected.profile.avatar || "⭐"} {selected.profile.name}</h3>
              <span className="pill blue">{selected.profile.username}</span>
            </div>
            <div className="metric-grid compact-metrics">
              <div className="metric"><strong>{selected.progress?.completedLessons.length || 0}</strong><small>完成故事</small></div>
              <div className="metric"><strong>{selected.progress?.stars || 0}</strong><small>星星</small></div>
              <div className="metric"><strong>{mistakes.length}</strong><small>需要複習</small></div>
              <div className="metric"><strong>{selected.progress?.badges.length || 0}</strong><small>徽章</small></div>
            </div>

            <h3>技能表現</h3>
            {(["listen", "speak", "read", "write"] as const).map((skill) => (
              <div className="bar-row" key={skill}>
                <label><span>{skill}</span><span>{skillPercent(selected.progress, skill)}%</span></label>
                <div className="progress"><span style={{ width: `${skillPercent(selected.progress, skill)}%` }} /></div>
              </div>
            ))}

            <h3>常錯項目</h3>
            {mistakes.length ? mistakes.slice(0, 5).map((item) => (
              <p className="mistake-line" key={item.label}>
                <strong>{item.label}</strong>
                <small>{item.skill} · 錯 {item.count} 次 · {item.nextReview}</small>
              </p>
            )) : <p className="muted">目前沒有錯題。</p>}
          </>
        ) : (
          <p className="muted">還沒有學生資料。學生註冊並開始學習後，這裡會出現詳情。</p>
        )}
      </aside>
    </div>
  );
}

function Assignments({ students, teacher, supabaseReady }: { students: StudentRow[]; teacher: Profile | null; supabaseReady: boolean }) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [lessonId, setLessonId] = useState(appLessons[0].id);
  const [skill, setSkill] = useState<Skill | "all">("all");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [assignments, setAssignments] = useState<AppAssignment[]>([]);
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

  useEffect(() => {
    loadAssignments();
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
  const lessonTitle = (id: string) => appLessons.find((lesson) => lesson.id === id)?.title || id;
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
              {appLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
            </select>
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
  const [sourceLessonId, setSourceLessonId] = useState(appLessons[0].id);
  const [editingId, setEditingId] = useState("");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState(1);
  const [cover, setCover] = useState("📘");
  const [pattern, setPattern] = useState("I see a ____.");
  const [sentencesText, setSentencesText] = useState("");
  const [wordsText, setWordsText] = useState("");
  const [listenText, setListenText] = useState("");
  const [readText, setReadText] = useState("");
  const [speakText, setSpeakText] = useState("");
  const [writeText, setWriteText] = useState("");
  const [message, setMessage] = useState("");

  function loadLessonTemplate(lesson = appLessons.find((item) => item.id === sourceLessonId) || appLessons[0]) {
    setEditingId(lesson.id);
    setTitle(lesson.title);
    setTopic(lesson.topic);
    setLevel(lesson.level);
    setCover(lesson.cover);
    setPattern(lesson.pattern);
    setSentencesText(lesson.sentences.map((item) => `${item.en} | ${item.zh} | ${item.image}`).join("\n"));
    setWordsText(lesson.words.map((item) => `${item.word} | ${item.meaning} | ${item.part} | ${item.image} | ${item.example} | ${item.translation} | ${item.level}`).join("\n"));
    setListenText(lesson.listen.map((item) => `${item.prompt} | ${item.answer} | ${item.options.join(", ")} | ${item.audio || ""}`).join("\n"));
    setReadText(lesson.read.map((item) => `${item.prompt} | ${item.answer} | ${item.options.join(", ")}`).join("\n"));
    setSpeakText(lesson.speak.map((item) => `${item.prompt} | ${item.target}`).join("\n"));
    setWriteText(lesson.write.map((item) => `${item.prompt} | ${item.starter} | ${item.answerHint}`).join("\n"));
    setMessage("已載入現有課程，可修改後儲存為草稿。");
  }

  async function loadDrafts() {
    if (!supabaseReady || !supabase) return;
    const { data, error } = await supabase.from("course_drafts").select("*").order("updated_at", { ascending: false });
    if (error) {
      setMessage("課程草稿資料表還沒建立，請先執行 teacher-tools-upgrade.sql。");
      return;
    }
    setDrafts((data || []) as CourseDraft[]);
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
    setSentencesText(content.sentencesText || "");
    setWordsText(content.wordsText || "");
    setListenText(content.listenText || "");
    setReadText(content.readText || "");
    setSpeakText(content.speakText || "");
    setWriteText(content.writeText || "");
    setMessage("");
  }

  function resetDraftForm() {
    setEditingId("");
    setTitle("");
    setTopic("");
    setLevel(1);
    setCover("📘");
    setPattern("I see a ____.");
    setSentencesText("");
    setWordsText("");
    setListenText("");
    setReadText("");
    setSpeakText("");
    setWriteText("");
  }

  function newBlankCourse() {
    setEditingId("");
    setTitle("");
    setTopic("");
    setLevel(1);
    setCover("📘");
    setPattern("I see a ____.");
    setSentencesText("I see a _____. | 我看到一個_____。 | 👀");
    setWordsText("word | 中文意思 | noun | 📘 | I see a word. | 我看到一個單字。 | Level 1");
    setListenText("聽單字，選出意思：word | 中文意思 | 中文意思, 其他選項, 其他選項 | word");
    setReadText("What do you see? | word | word, book, bag");
    setSpeakText("跟讀單字 | word\n跟讀句子 | I see a word.");
    setWriteText("完成句子 | I see a ____. | word\n寫一句自己的句子 | I like ____. | your idea");
    setMessage("已建立空白課程模板，請填寫後按「新增草稿」。");
  }

  async function saveDraft() {
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
    const { error } = await supabase.from("course_drafts").upsert({
      id,
      title: title.trim(),
      topic: topic.trim(),
      level,
      cover,
      pattern,
      status: "draft",
      content: {
        sentencesText,
        wordsText,
        listenText,
        readText,
        speakText,
        writeText
      },
      updated_by: teacher.id,
      updated_at: new Date().toISOString()
    });
    if (error) {
      setMessage(error.message.includes("course_drafts") ? "課程草稿資料表還沒建立，請先執行 teacher-tools-upgrade.sql。" : error.message);
      return;
    }
    setMessage("課程草稿已儲存。");
    resetDraftForm();
    await loadDrafts();
  }

  async function deleteDraft(id: string) {
    if (!supabaseReady || !supabase) return;
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

  return (
    <div className="grid two">
      <article className="panel">
        <h3>內建課程列表</h3>
        <table className="table">
          <thead><tr><th>課程</th><th>主題</th><th>單字</th><th>狀態</th></tr></thead>
          <tbody>
            {appLessons.map((lesson) => <tr key={lesson.id}><td>{lesson.title}</td><td>{lesson.topic}</td><td>{lesson.words.length}</td><td>Published</td></tr>)}
          </tbody>
        </table>
      </article>
      <article className="panel">
        <h3>新增 / 編輯完整課程草稿</h3>
        <p className="muted">可選現有課程載入模板，修改故事、單字、聽說讀寫。草稿不會立即改動學生端，下一階段再加入發布。</p>
        <div className="btns">
          <button className="btn primary" type="button" onClick={newBlankCourse}>新增空白課程單元</button>
        </div>
        <div className="field">
          <label>選擇現有課程作為模板</label>
          <div className="inline-controls">
            <select value={sourceLessonId} onChange={(event) => setSourceLessonId(event.target.value)}>
              {appLessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
            </select>
            <button className="btn secondary" type="button" onClick={() => loadLessonTemplate()}>載入編輯</button>
          </div>
        </div>
        <form className="form" onSubmit={(event) => { event.preventDefault(); saveDraft(); }}>
          <div className="field"><label>課程名稱</label><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：At the Park" /></div>
          <div className="field"><label>主題</label><input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="例如：Nature" /></div>
          <div className="field"><label>Level</label><input type="number" min={1} max={6} value={level} onChange={(event) => setLevel(Number(event.target.value))} /></div>
          <div className="field"><label>封面圖示</label><input value={cover} onChange={(event) => setCover(event.target.value)} /></div>
          <div className="field"><label>句型</label><input value={pattern} onChange={(event) => setPattern(event.target.value)} /></div>
          <div className="field"><label>故事句子（一行一個：英文 | 中文 | 圖示）</label><textarea rows={5} value={sentencesText} onChange={(event) => setSentencesText(event.target.value)} /></div>
          <div className="field"><label>單字（一行一個：word | 中文 | 詞性 | 圖示 | 例句 | 翻譯 | Level）</label><textarea rows={6} value={wordsText} onChange={(event) => setWordsText(event.target.value)} /></div>
          <div className="field"><label>聽力題（一行一題：題目 | 答案 | 選項1, 選項2, 選項3 | 音訊文字）</label><textarea rows={5} value={listenText} onChange={(event) => setListenText(event.target.value)} /></div>
          <div className="field"><label>閱讀題（一行一題：題目 | 答案 | 選項1, 選項2, 選項3）</label><textarea rows={5} value={readText} onChange={(event) => setReadText(event.target.value)} /></div>
          <div className="field"><label>口說任務（一行一題：提示 | 目標句）</label><textarea rows={4} value={speakText} onChange={(event) => setSpeakText(event.target.value)} /></div>
          <div className="field"><label>寫作任務（一行一題：提示 | 開頭句 | 答案提示）</label><textarea rows={4} value={writeText} onChange={(event) => setWriteText(event.target.value)} /></div>
          {message && <p className={message.includes("已儲存") ? "success-text" : "form-error"}>{message}</p>}
          <div className="btns">
            <button className="btn primary" type="submit">{editingId ? "更新草稿" : "新增草稿"}</button>
            <button className="btn secondary" type="button" onClick={resetDraftForm}>清空</button>
          </div>
        </form>
        <div className="draft-list">
          {drafts.map((draft) => (
            <div className="assignment-row" key={draft.id}>
              <strong>{draft.cover} {draft.title}</strong>
              <small>{draft.topic} · Level {draft.level} · {draft.status}</small>
              <div className="btns">
                <button className="btn secondary" onClick={() => editDraft(draft)}>編輯</button>
                <button className="btn primary" onClick={() => setDraftStatus(draft.id, draft.status === "published" ? "draft" : "published")}>
                  {draft.status === "published" ? "下架" : "發布到學生端"}
                </button>
                <button className="btn ghost" onClick={() => deleteDraft(draft.id)}>刪除</button>
              </div>
            </div>
          ))}
        </div>
        <p className="muted">目前內建課程共 {appLessons.length} 課，{totalWords} 個單字。</p>
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
