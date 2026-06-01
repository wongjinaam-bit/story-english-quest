"use client";

import { useMemo, useState } from "react";
import { appLessons } from "@/data/lessons";

type AdminTab = "dashboard" | "students" | "assignments" | "courses" | "admin";

const demoStudents = [
  { id: "s1", name: "Amy Chen", completed: 3, weak: "Listening", stars: 42 },
  { id: "s2", name: "Ben Lin", completed: 2, weak: "Writing", stars: 31 },
  { id: "s3", name: "Mia Wong", completed: 5, weak: "Speaking", stars: 78 }
];

export function AdminApp() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<"teacher" | "admin">("teacher");
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const [error, setError] = useState("");

  function login(email: string, password: string) {
    const okTeacher = email === "teacher@example.com" && password === "teacher123";
    const okAdmin = email === "admin@example.com" && password === "admin123";
    if (okTeacher || okAdmin) {
      setRole(okAdmin ? "admin" : "teacher");
      setLoggedIn(true);
      setError("");
    } else {
      setError("帳號或密碼不正確。Demo 教師：teacher@example.com / teacher123；Admin：admin@example.com / admin123");
    }
  }

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
          <p className="muted">MVP 先提供 demo 帳號。正式版可替換為 Supabase Auth。</p>
          <div className="field">
            <label>帳號</label>
            <input name="email" type="email" placeholder="teacher@example.com" />
          </div>
          <div className="field">
            <label>密碼</label>
            <input name="password" type="password" placeholder="teacher123" />
          </div>
          {error && <p style={{ color: "var(--rose)", fontWeight: 800 }}>{error}</p>}
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
        <nav className="nav">
          {(["dashboard", "students", "assignments", "courses", "admin"] as AdminTab[]).map((item) => (
            <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)} disabled={item === "admin" && role !== "admin"}>
              {adminTitle(item)}
            </button>
          ))}
          <button className="btn secondary full" onClick={() => setLoggedIn(false)}>登出</button>
          <a className="btn secondary full" href="/">回學生端</a>
        </nav>
      </aside>
      <main className="admin-main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Management</p>
            <h2>{adminTitle(tab)}</h2>
          </div>
        </header>
        {tab === "dashboard" && <Dashboard />}
        {tab === "students" && <Students />}
        {tab === "assignments" && <Assignments />}
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

function Dashboard() {
  return (
    <>
      <div className="metric-grid">
        <div className="metric"><strong>{demoStudents.length}</strong><small>學生總數</small></div>
        <div className="metric"><strong>2</strong><small>今日完成</small></div>
        <div className="metric"><strong>73%</strong><small>平均完成率</small></div>
        <div className="metric"><strong>8</strong><small>已發布課程</small></div>
      </div>
      <div className="grid two" style={{ marginTop: 18 }}>
        <article className="panel">
          <h3>聽說讀寫平均表現</h3>
          {["聽力 82%", "口說 68%", "閱讀 76%", "寫作 61%"].map((item) => {
            const value = Number(item.match(/\d+/)?.[0] || 0);
            return <div className="bar-row" key={item}><label><span>{item}</span></label><div className="progress"><span style={{ width: `${value}%` }} /></div></div>;
          })}
        </article>
        <article className="panel">
          <h3>最近 7 天</h3>
          <p className="muted">MVP 顯示示範統計；正式版會從 Supabase 讀取 student_answers 和 student_progress。</p>
        </article>
      </div>
    </>
  );
}

function Students() {
  return (
    <article className="panel">
      <h3>學生列表</h3>
      <table className="table">
        <thead><tr><th>學生</th><th>完成故事</th><th>弱項</th><th>星星</th></tr></thead>
        <tbody>
          {demoStudents.map((student) => (
            <tr key={student.id}><td>{student.name}</td><td>{student.completed}</td><td>{student.weak}</td><td>{student.stars}</td></tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function Assignments() {
  return (
    <article className="panel">
      <h3>指定任務</h3>
      <form className="form">
        <div className="field"><label>學生</label><select>{demoStudents.map((s) => <option key={s.id}>{s.name}</option>)}</select></div>
        <div className="field"><label>課程</label><select>{appLessons.map((lesson) => <option key={lesson.id}>{lesson.title}</option>)}</select></div>
        <div className="field"><label>技能</label><select><option>全部</option><option>聽力</option><option>口說</option><option>閱讀</option><option>寫作</option></select></div>
        <button className="btn primary" type="button">建立指定任務</button>
      </form>
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
        <div className="form">
          <div className="field"><label>故事標題</label><input placeholder="New Story Title" /></div>
          <div className="field"><label>故事句子</label><textarea rows={5} placeholder="One sentence per line" /></div>
          <button className="btn primary" type="button">儲存草稿</button>
        </div>
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
          <p className="muted">正式版連接 Supabase 權限與資料表。</p>
          <button className="btn secondary">開啟</button>
        </article>
      ))}
    </div>
  );
}
