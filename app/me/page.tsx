"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

type UsuarioRow = {
  id: string;
  igreja_id: string;
  email: string;
};

export default function MePage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<UsuarioRow | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let active = true;

    async function run() {
      setBusy(true);
      setErr(null);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (!active) return;

      if (sessionErr) {
        setErr(sessionErr.message);
        setBusy(false);
        return;
      }

      const session = sessionData.session;
      if (!session) {
        router.replace("/login");
        return;
      }

      setEmail(session.user.email ?? null);

      // Teste RLS: buscar a linha em public.usuarios do próprio user.
      const { data, error } = await supabase
        .from("usuarios")
        .select("id, igreja_id, email")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }

      setUsuario((data as UsuarioRow) ?? null);
      setBusy(false);
    }

    run();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Meu Perfil (técnico)</h1>

      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Esta página é só para validar Auth + RLS. O “cadastro completo de membro” vem na ETAPA 3.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 16,
          border: "1px solid #333",
          background: "#0b0b0b",
          color: "#fff",
          maxWidth: 720
        }}
      >
        {busy ? <p style={{ margin: 0 }}>A carregar…</p> : null}

        {!busy && err ? (
          <p style={{ margin: 0, color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{err}</p>
        ) : null}

        {!busy && !err ? (
          <>
            <p style={{ margin: 0 }}>
              <strong>Email (Auth):</strong> {email ?? "—"}
            </p>
            <p style={{ marginTop: 8, marginBottom: 0 }}>
              <strong>public.usuarios:</strong>
            </p>
            <pre
              style={{
                marginTop: 8,
                marginBottom: 0,
                padding: 12,
                borderRadius: 12,
                background: "#111",
                overflowX: "auto"
              }}
            >
{JSON.stringify(usuario, null, 2)}
            </pre>
          </>
        ) : null}
      </div>

      <button
        onClick={logout}
        style={{
          marginTop: 16,
          padding: 10,
          borderRadius: 12,
          border: "1px solid #444",
          background: "#111",
          color: "#fff",
          cursor: "pointer"
        }}
      >
        Sair
      </button>
    </main>
  );
}
