import { supabase } from "@/lib/supabase";
import { cleanUsername, usernameToEmail } from "@/lib/progress";
import { defaultLearningLevel } from "@/lib/learning-levels";
import type { LearningLevel, Profile, StudentSession, UserRole } from "@/lib/types";

type AuthResult =
  | { ok: true; profile: Profile; session: StudentSession }
  | { ok: false; message: string };

function friendlyAuthMessage(message: string) {
  const text = message.toLowerCase();
  if (text.includes("already registered") || text.includes("already exists")) {
    return "這個學生帳號已經註冊過了，請改用「學生登入」。";
  }
  if (text.includes("invalid login credentials")) {
    return "帳號或密碼不正確，請再檢查一次。";
  }
  if (text.includes("email not confirmed")) {
    return "這個帳號還沒有完成 Email 驗證。若不想驗證，請到 Supabase 關閉 Email confirmation。";
  }
  if (text.includes("password")) {
    return "密碼格式不符合要求，請使用至少 6 個字。";
  }
  return message;
}

export function isSupabaseReady() {
  return Boolean(supabase);
}

export async function signUpStudent(params: {
  username: string;
  password: string;
  name: string;
  avatar: string;
  proficiencyLevel: LearningLevel;
}): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: "Supabase 還沒設定，暫時不能註冊正式帳號。" };

  const username = cleanUsername(params.username);
  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signUp({
    email,
    password: params.password,
    options: {
      data: {
        name: params.name,
        username,
        role: "student",
        avatar: params.avatar,
        proficiency_level: params.proficiencyLevel
      }
    }
  });

  if (error) return { ok: false, message: friendlyAuthMessage(error.message) };
  if (!data.user) return { ok: false, message: "註冊沒有成功，請再試一次。" };

  const profile = await upsertProfile({
    id: data.user.id,
    name: params.name,
    username,
    role: "student",
    avatar: params.avatar,
    proficiencyLevel: params.proficiencyLevel
  });

  if (!profile.ok) return profile;
  return { ok: true, profile: profile.profile, session: profileToStudentSession(profile.profile) };
}

export async function signInStudent(username: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, message: "Supabase 還沒設定，暫時不能登入正式帳號。" };

  const clean = cleanUsername(username);
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(clean),
    password
  });

  if (error) return { ok: false, message: friendlyAuthMessage(error.message) };
  if (!data.user) return { ok: false, message: "登入沒有成功，請檢查帳號密碼。" };

  const profile = await getOrCreateProfile(data.user.id, {
    name: data.user.user_metadata?.name || clean,
    username: clean,
    role: "student",
    avatar: data.user.user_metadata?.avatar || "⭐",
    proficiencyLevel: defaultLearningLevel(data.user.user_metadata?.proficiency_level)
  });

  if (!profile.ok) return profile;
  if (profile.profile.role !== "student") return { ok: false, message: "這不是學生帳號，請到教師後台登入。" };

  await touchLastSeen(profile.profile.id);
  return { ok: true, profile: profile.profile, session: profileToStudentSession(profile.profile) };
}

export async function signInStaff(email: string, password: string): Promise<{ ok: true; profile: Profile } | { ok: false; message: string }> {
  if (!supabase) return { ok: false, message: "Supabase 還沒設定，暫時使用 demo 後台。" };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: friendlyAuthMessage(error.message) };
  if (!data.user) return { ok: false, message: "登入沒有成功，請檢查帳號密碼。" };

  const profile = await getProfile(data.user.id);
  if (!profile.ok) return profile;
  if (profile.profile.role === "student") return { ok: false, message: "學生帳號不能登入教師後台。" };
  await touchLastSeen(profile.profile.id);
  return { ok: true, profile: profile.profile };
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
}

async function getProfile(id: string): Promise<{ ok: true; profile: Profile } | { ok: false; message: string }> {
  if (!supabase) return { ok: false, message: "Supabase is not configured." };
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (error) return { ok: false, message: error.message };
  return { ok: true, profile: data as Profile };
}

async function getOrCreateProfile(
  id: string,
  fallback: { name: string; username: string; role: UserRole; avatar: string; proficiencyLevel?: LearningLevel }
): Promise<{ ok: true; profile: Profile } | { ok: false; message: string }> {
  const existing = await getProfile(id);
  if (existing.ok) return existing;
  return upsertProfile({ id, ...fallback });
}

async function upsertProfile(params: {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  avatar: string;
  proficiencyLevel?: LearningLevel;
}): Promise<{ ok: true; profile: Profile } | { ok: false; message: string }> {
  if (!supabase) return { ok: false, message: "Supabase is not configured." };
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      id: params.id,
      name: params.name,
      username: params.username,
      role: params.role,
      avatar: params.avatar,
      proficiency_level: params.proficiencyLevel || "beginner",
      last_seen_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) return { ok: false, message: error.message };
  return { ok: true, profile: data as Profile };
}

async function touchLastSeen(id: string) {
  if (!supabase) return;
  await supabase.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", id);
}

function profileToStudentSession(profile: Profile): StudentSession {
  return {
    id: profile.id,
    authId: profile.id,
    name: profile.name,
    code: profile.username || profile.id.slice(0, 6),
    avatar: profile.avatar || "⭐",
    proficiencyLevel: defaultLearningLevel(profile.proficiency_level),
    loginAt: new Date().toISOString(),
    mode: "supabase"
  };
}
