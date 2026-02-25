/* PATH: app/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../lib/supabase/client";

function Card({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <a
      href={href}
      className="card cardGlow"
      style={{
        display: "block",
        padding: 16,
        color: "#fff",
        textDecoration: "none"
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 18 }}>{title}</div>
      <div style={{ opacity: 0.82, marginTop: 8, lineHeight: 1.35 }}>{desc}</div>
      <div style={{ marginTop: 12, opacity: 0.95, color: "var(--accent)", fontWeight: 850 }}>Abrir →</div>
    </a>
  );
}

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
      <main style={{ padding: 6 }}>
        <h1 className="h-accent" style={{ marginTop: 4, marginBottom: 6 }}>
          Início
        </h1>
        <p style={{ opacity: 0.85 }}>A carregar…</p>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <main style={{ padding: 6 }}>
        <h1 className="h-accent" style={{ marginTop: 4, marginBottom: 6 }}>
          LTZ-CHURCH
        </h1>
        <p style={{ opacity: 0.85 }}>Precisas de autenticação para aceder ao app.</p>

        <a href="/login" className="btn btnAccent" style={{ display: "inline-block", marginTop: 12, textDecoration: "none" }}>
          Entrar
        </a>
      </main>
    );
  }

  return (
    <main style={{ padding: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 className="h-accent" style={{ marginTop: 4, marginBottom: 6 }}>
            Início
          </h1>
          <p style={{ opacity: 0.85, marginTop: 0 }}>
            Acesso rápido ao operacional.
          </p>
        </div>

        <button onClick={logout} className="btn" style={{ height: "fit-content" }}>
          Sair
        </button>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
        }}
      >
        <Card title="Cultos & Escalas" desc="Ver próximos cultos e gerir equipas por função." href="/cultos" />
        <Card title="Agenda" desc="Criar e consultar eventos (avulsos e recorrentes)." href="/agenda" />
        <Card title="Membros" desc="Gerir membros e (mais tarde) cadastro completo." href="/membros" />
        <Card title="Departamentos" desc="Gerir departamentos e associações." href="/departamentos" />
        <Card title="Funções" desc="Gerir funções e inativar quando necessário." href="/funcoes" />
        <Card title="Perfil" desc="Os teus dados técnicos e validação de acesso." href="/me" />
      </div>

      <div className="card" style={{ marginTop: 18, padding: 14 }}>
        <div style={{ fontWeight: 950, display: "flex", alignItems: "center", gap: 10 }}>
          <span className="pill pillAccent">Admin</span>
          Configuração
        </div>
        <div style={{ opacity: 0.85, marginTop: 8, lineHeight: 1.35 }}>
          Mantemos estas páginas fora do menu principal para não poluir a operação.
        </div>
        <ul style={{ marginTop: 10, marginBottom: 0, opacity: 0.9, lineHeight: 1.6 }}>
          <li>
            <a href="/congregacoes" style={{ textDecoration: "underline", opacity: 0.95 }}>
              Congregações
            </a>
          </li>
          <li>
            <a href="/atividades" style={{ textDecoration: "underline", opacity: 0.95 }}>
              Tipos de evento (Atividades)
            </a>
          </li>
          <li>
            <a href="/agenda/series" style={{ textDecoration: "underline", opacity: 0.95 }}>
              Recorrências (Séries)
            </a>
          </li>
        </ul>
      </div>
    </main>
  );
}