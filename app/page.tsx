"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../lib/supabase/client";

export default function HomePage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) {
        // se houver erro, tratamos como não autenticado
        setIsAuthed(false);
        setReady(true);
        return;
      }

      setIsAuthed(!!data.session);
      setReady(true);
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (!ready) {
    return (
      <main style={{ padding: 24 }}>
        <h1>LTZ-CHURCH</h1>
        <p>A carregar…</p>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <main style={{ padding: 24 }}>
        <h1>LTZ-CHURCH</h1>
        <p>Precisas de autenticação para aceder ao app.</p>

        <a
          href="/login"
          style={{
            display: "inline-block",
            marginTop: 12,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #444",
            background: "#111",
            color: "#fff",
            textDecoration: "none"
          }}
        >
          Entrar
        </a>
      </main>
    );
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>LTZ-CHURCH</h1>
      <p>Menu</p>

      <ul>
        <li><a href="/meus-dados">Meus Dados</a></li>
        <li><a href="/congregacoes">Congregações</a></li>
        <li><a href="/departamentos">Departamentos</a></li>
        <li><a href="/membros/departamentos">Membros ↔ Departamentos</a></li>
        <li><a href="/atividades">Atividades</a></li>
        <li><a href="/health">Health (técnico)</a></li>
      </ul>

      <button
        onClick={logout}
        style={{
          marginTop: 12,
          padding: "10px 14px",
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
