/* PATH: app/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../lib/supabase/client";

type Role = "admin" | "membro";

type Card = {
  title: string;
  desc: string;
  href: string;
  audience: Role[]; // quem vê
};

const CARDS: Card[] = [
  {
    title: "Cultos & Escalas",
    desc: "Ver próximos cultos e gerir equipas por função.",
    href: "/cultos",
    audience: ["admin"]
  },
  {
    title: "Minhas Escalas",
    desc: "Ver onde estás convocado e confirmar presença.",
    href: "/cultos",
    audience: ["membro"]
  },
  {
    title: "Agenda",
    desc: "Criar e consultar eventos (avulsos e recorrentes).",
    href: "/agenda",
    audience: ["admin"]
  },
  {
    title: "Minha Agenda",
    desc: "Ver os teus compromissos e avisos.",
    href: "/agenda",
    audience: ["membro"]
  },
  {
    title: "Membros",
    desc: "Gerir membros e (mais tarde) cadastro completo.",
    href: "/membros",
    audience: ["admin"]
  },
  {
    title: "Departamentos",
    desc: "Gerir departamentos e associações.",
    href: "/departamentos",
    audience: ["admin"]
  },
  {
    title: "Funções",
    desc: "Gerir funções e inativar quando necessário.",
    href: "/funcoes",
    audience: ["admin"]
  },
  {
    title: "Perfil",
    desc: "Os teus dados e preferências.",
    href: "/me",
    audience: ["admin", "membro"]
  },
  {
    title: "Aparência",
    desc: "Escolher a cor de contraste (accent).",
    href: "/definicoes/aparencia",
    audience: ["admin", "membro"]
  }
];

export default function HomePage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  const [role, setRole] = useState<Role>("membro");
  const [tenantNome, setTenantNome] = useState<string>("—");

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

      const authed = !!data.session;
      setIsAuthed(authed);

      if (!authed) {
        setReady(true);
        return;
      }

      // carrega role + tenant (mesma lógica do header, mas leve)
      try {
        const userId = data.session?.user?.id;
        if (!userId) {
          setReady(true);
          return;
        }

        const uRes = await supabase.from("usuarios").select("role, igreja_id").eq("id", userId).maybeSingle();
        if (!active) return;

        const r = (uRes.data?.role as Role | null) ?? "membro";
        setRole(r);

        const igrejaId = (uRes.data?.igreja_id as string | null) ?? null;
        if (igrejaId) {
          const iRes = await supabase.from("igrejas").select("nome").eq("id", igrejaId).maybeSingle();
          if (!active) return;
          setTenantNome((iRes.data?.nome as string | null) ?? "—");
        } else {
          setTenantNome("—");
        }
      } catch {
        // ignora: home não pode crashar
      }

      setReady(true);
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  if (!ready) {
    return (
      <main style={{ padding: 24 }}>
        <h1 className="h-accent">Início</h1>
        <p style={{ opacity: 0.8 }}>A carregar…</p>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <main style={{ padding: 24 }}>
        <h1>LT-CHURCH</h1>
        <p>Precisas de autenticação para aceder ao app.</p>

        <a href="/login" className="btn btnAccent" style={{ display: "inline-flex", marginTop: 12 }}>
          Entrar
        </a>
      </main>
    );
  }

  const visibleCards = CARDS.filter((c) => c.audience.includes(role));

  return (
    <main style={{ padding: 10 }}>
      {/* título humano, sem “Operacional” fixo */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 className="h-accent" style={{ margin: 0 }}>
            Início
          </h1>
          <div style={{ marginTop: 6, color: "var(--textDim)", fontWeight: 750 }}>
            {tenantNome !== "—" ? tenantNome : "Acesso rápido"}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
        }}
      >
        {visibleCards.map((c) => (
          <a
            key={c.href + c.title}
            href={c.href}
            className="card cardGlow"
            style={{
              textDecoration: "none",
              color: "#fff",
              padding: 16,
              minHeight: 130,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div>
              <div style={{ fontSize: 20, fontWeight: 950 }}>{c.title}</div>
              <div style={{ marginTop: 8, opacity: 0.9, lineHeight: 1.35 }}>{c.desc}</div>
            </div>
            <div style={{ marginTop: 14, color: "var(--accent)", fontWeight: 950 }}>
              Abrir <span style={{ opacity: 0.8 }}>→</span>
            </div>
          </a>
        ))}
      </div>

      {/* Nota: links técnicos ficam fora daqui (como pediste) */}
    </main>
  );
}
