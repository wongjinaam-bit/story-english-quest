import { supabase } from "@/lib/supabase";
import { cleanUsername, usernameToEmail } from "@/lib/progress";
import type { Profile, StudentSession, UserRole } from "@/lib/types";

type AuthResult =
  | { ok: true; profile: Profile; session: StudentSession }
  | { ok: false; message: string };

export function isSupabaseReady() {
  return Boolean(supabase);
}

export async function signUpStudent(params: {
  username: string;
  password: string;
  name: string;
  avatar: string;
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
        avatar: params.avatar
      }
    }
  });

  if (error) return { ok: false, message: error.message };
  if (!data.user) return { ok: false, message: "註冊沒有成功，請再試一次。" };

  const profile = await upsertProfile({
    id: data.user.id,
    name: params.name,
    username,
    role: "student",
    avatar: params.avatar
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

  if (error) return { ok: false, message: error.message };
  if (!data.user) return { ok: false, message: "登入沒有成功，請檢查帳號密碼。" };

  const profile = await getOrCreateProfile(data.user.id, {
    name: data.user.user_metadata?.name || clean,
    username: clean,
    role: "student",
    avatar: data.user.user_metadata?.avatar || "⭐"
  });

  if (!profile.ok) return profile;
  if (profile.profile.role !== "student") return { ok: false, message: "這不是學生帳號，請到教師後台登入。" };

  await touchLastSeen(profile.profile.id);
  return { ok: true, profile: profile.profile, session: profileToStudentSession(profile.profile) };
}

export async function signInStaff(email: string, password: string): Promise<{ ok: true; profile: Profile } | { ok: false; message: string }> {
  if (!supabase) return { ok: false, message: "Supabase 還沒設定，暫時使用 demo 後台。" };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: error.message };
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
  fallback: { name: string; username: string; role: UserRole; avatar: string }
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
    loginAt: new Date().toISOString(),
    mode: "supabase"
  };
}
