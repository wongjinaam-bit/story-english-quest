"use client";

import { useEffect, useMemo, useState } from "react";
import { appLessons } from "@/data/lessons";
import { isSupabaseReady, signInStaff, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Profile, StudentProgress, UserRole } from "@/lib/types";

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
        {tab === "assignments" && <Assignments students={students} />}
        {tab === "courses" && <Courses />}
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

function Assignments({ students }: { students: StudentRow[] }) {
  return (
    <article className="panel">
      <h3>指定任務</h3>
      <form className="form">
        <div className="field">
          <label>學生</label>
          <select>
            {students.length ? students.map((s) => <option key={s.profile.id}>{s.profile.name}</option>) : demoStudents.map((s) => <option key={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field"><label>課程</label><select>{appLessons.map((lesson) => <option key={lesson.id}>{lesson.title}</option>)}</select></div>
        <div className="field"><label>技能</label><select><option>全部</option><option>聽力</option><option>口說</option><option>閱讀</option><option>寫作</option></select></div>
        <button className="btn secondary" type="button" disabled>下一階段：建立指定任務</button>
      </form>
      <p className="muted">任務指定寫入資料庫會放在下一階段實作。</p>
    </article>
  );
}

function Courses() {
  const totalWords = useMemo(() => appLessons.reduce((sum, lesson) => sum + lesson.words.length, 0), []);
  return (
    <div className="grid two">
      <article className="panel">
        <h3>課程列表</h3>
        <table className="table">
          <thead><tr><th>課程</th><th>主題</th><th>單字</th><th>狀態</th></tr></thead>
          <tbody>
            {appLessons.map((lesson) => <tr key={lesson.id}><td>{lesson.title}</td><td>{lesson.topic}</td><td>{lesson.words.length}</td><td>Published</td></tr>)}
          </tbody>
        </table>
      </article>
      <article className="panel">
        <h3>內容概況</h3>
        <p className="muted">共 {appLessons.length} 課，{totalWords} 個單字。MVP 先使用內建資料；正式版可連接 Supabase 編輯與發布。</p>
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
