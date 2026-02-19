"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setMsg(error.message);
        return;
      }
      if (data.session) router.replace("/meus-dados");
    });

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.replace("/meus-dados");
  }

  return (
    <main style={{ padding: 24, maxWidth: 420 }}>
      <h1 style={{ marginTop: 0 }}>Entrar</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #333",
              background: "#0b0b0b",
              color: "#fff"
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #333",
              background: "#0b0b0b",
              color: "#fff"
            }}
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          style={{
            padding: 12,
            borderRadius: 12,
            border: "1px solid #444",
            background: busy ? "#222" : "#111",
            color: "#fff",
            cursor: busy ? "not-allowed" : "pointer"
          }}
        >
          {busy ? "A entrar..." : "Entrar"}
        </button>

        {msg ? (
          <p style={{ color: "#ff6b6b", margin: 0, whiteSpace: "pre-wrap" }}>{msg}</p>
        ) : null}
      </form>
    </main>
  );
}
