import { useEffect } from "react";
import { supabase } from "../supabase";
import { useAuthStore } from "../store";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../constants";
import type { DbUser } from "../types";

/**
 * Auto-restore session on mount and listen for auth changes.
 * Call this once in the root layout.
 */
export function useSupabaseAuth() {
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    // Restore existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        logout();
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchProfile(uid: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();

    if (data && !error) {
      const u = data as DbUser;
      setUser({
        id: u.id,
        email: u.email,
        name: u.name || u.username || "Usuario",
        avatar: u.avatar,
        interests: [],
        bio: u.bio,
        gender: u.gender,
        handle: u.username,
      });
    }
  }
}

/**
 * Sign in with email/password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Sign up with email/password + name.
 * Creates the user via admin API with email pre-confirmed,
 * then auto-signs-in immediately so the user is logged in right away.
 */
export async function signUp(
  email: string,
  password: string,
  name: string
) {
  // Try admin API first (creates user with email already confirmed)
  const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ?? "";
  
  if (serviceRoleKey) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      }),
    });

    const body = await res.json();

    if (!res.ok) {
      // If user already exists, let them know
      if (body?.msg?.includes("already") || body?.message?.includes("already")) {
        throw new Error("User already registered");
      }
      throw new Error(body?.msg || body?.message || "Error al crear cuenta");
    }

    // User created with confirmed email — now sign in
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    return signInData;
  }

  // Fallback: standard signup (may require email confirmation)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) throw error;

  // If we got a user but no active session, try to sign in directly
  if (data.user && !data.session) {
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      return data;
    }
    return signInData;
  }

  return data;
}

/**
 * Sign out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
