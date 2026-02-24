/* PATH: app/cultos/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

type Evento = {
  id: string;
  starts_at: string | null;
  titulo: string | null;
  congregacao_id: string | null;
};

type Congregacao = { id: string; nome: string | null };

type Escala = { id: string; evento_id: string };

function fmtLisbon(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

function badge(text: string, tone: "neutral" | "warn" | "ok") {
  const bg =
    tone === "ok" ? "#0f2a12" : tone === "warn" ? "#2a1d0f" : "#111";
  const bd =
    tone === "ok" ? "#1f6a2a" : tone === "warn" ? "#6a4a1f" : "#333";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${bd}`,
        background: bg,
        color: "#fff",
        fontWeight: 800,
        fontSize: 13,
        opacity: 0.95
      }}
    >
      {text}
    </span>
  );
}

export default function CultosHubPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [congregacoes, setCongregacoes] = useState<Map<string, Congregacao>>(new Map());
  const [escalasByEvento, setEscalasByEvento] = useState<Map<string, Escala>>(new Map());
  const [pessoasCountByEscala, setPessoasCountByEscala] = useState<Map<string, number>>(new Map());
  const [creatingForEvento, setCreatingForEvento] = useState<Record<string, boolean>>({});

  async function requireSessionOrRedirect() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.replace("/login");
      return false;
    }
    return true;
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function load() {
    setBusy(true);
    setErr(null);

    const okSession = await requireSessionOrRedirect();
    if (!okSession) return;

    // 1) descobrir a atividade "Culto" (regra A: tipo de evento)
    const atRes = await supabase
      .from("atividades")
      .select("id, nome")
      .ilike("nome", "culto")
      .limit(1)
      .maybeSingle();

    if (atRes.error) {
      setErr(atRes.error.message);
      setBusy(false);
      return;
    }

    const cultoAtividadeId = atRes.data?.id;
    if (!cultoAtividadeId) {
      setErr("Não existe a atividade 'Culto' em atividades.");
      setBusy(false);
      return;
    }

    // 2) próximos eventos de culto
    const nowIso = new Date().toISOString();
    const evRes = await supabase
      .from("agenda_eventos")
      .select("id, starts_at, titulo, congregacao_id")
      .eq("atividade_id", cultoAtividadeId)
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(30);

    if (evRes.error) {
      setErr(evRes.error.message);
      setBusy(false);
      return;
    }

    const evs = (evRes.data as Evento[]) ?? [];
    setEventos(evs);

    // 3) congregações (para nome)
    const congIds = Array.from(new Set(evs.map((e) => e.congregacao_id).filter(Boolean))) as string[];
    if (congIds.length > 0) {
      const cgRes = await supabase.from("congregacoes").select("id, nome").in("id", congIds);
      if (cgRes.error) {
        setErr(cgRes.error.message);
        setBusy(false);
        return;
      }
      const map = new Map<string, Congregacao>();
      ((cgRes.data as Congregacao[]) ?? []).forEach((c) => map.set(c.id, c));
      setCongregacoes(map);
    } else {
      setCongregacoes(new Map());
    }

    // 4) escalas existentes para estes eventos
    const eventIds = evs.map((e) => e.id);
    if (eventIds.length === 0) {
      setEscalasByEvento(new Map());
      setPessoasCountByEscala(new Map());
      setBusy(false);
      return;
    }

    const esRes = await supabase
      .from("escalas")
      .select("id, evento_id")
      .in("evento_id", eventIds);

    if (esRes.error) {
      setErr(esRes.error.message);
      setBusy(false);
      return;
    }

    const escalas = (esRes.data as Escala[]) ?? [];
    const mapEsc = new Map<string, Escala>();
    escalas.forEach((s) => mapEsc.set(s.evento_id, s));
    setEscalasByEvento(mapEsc);

    // 5) pessoas atribuídas: conta por escala via escala_itens
    // Regra A: NÃO existe "total". Só mostramos quantas pessoas já estão atribuídas.
    if (escalas.length > 0) {
      const escalaIds = escalas.map((s) => s.id);
      const itRes = await supabase
        .from("escala_itens")
        .select("id, escala_id")
        .in("escala_id", escalaIds);

      if (itRes.error) {
        setErr(itRes.error.message);
        setBusy(false);
        return;
      }

      const counts = new Map<string, number>();
      for (const row of (itRes.data as any[]) ?? []) {
        const sid = row.escala_id as string;
        counts.set(sid, (counts.get(sid) ?? 0) + 1);
      }
      setPessoasCountByEscala(counts);
    } else {
      setPessoasCountByEscala(new Map());
    }

    setBusy(false);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await load();
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createEscalaForEvento(eventoId: string) {
    setCreatingForEvento((p) => ({ ...p, [eventoId]: true }));
    setErr(null);

    const res = await supabase
      .from("escalas")
      .insert({ evento_id: eventoId })
      .select("id, evento_id")
      .single();

    setCreatingForEvento((p) => ({ ...p, [eventoId]: false }));

    if (res.error) {
      setErr(res.error.message);
      return;
    }

    const escalaId = (res.data as Escala).id;
    router.push(`/escalas/${escalaId}`);
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, color: "#fff" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <a href="/agenda" style={{ color: "#fff", opacity: 0.9, textDecoration: "underline" }}>
          Agenda
        </a>
        <button
          onClick={logout}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #444",
            background: "#111",
            color: "#fff"
          }}
        >
          Sair
        </button>
      </div>

      <h1 style={{ marginTop: 14 }}>Cultos & Escalas</h1>
      <p style={{ opacity: 0.85, marginTop: 6 }}>
        Age por culto/evento. A escala começa vazia e tu adicionas pessoas por função.
      </p>

      {busy ? <p>A carregar…</p> : null}
      {err ? <p style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{err}</p> : null}

      {!busy ? (
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          {eventos.map((ev) => {
            const escala = escalasByEvento.get(ev.id) ?? null;
            const pessoas = escala ? (pessoasCountByEscala.get(escala.id) ?? 0) : 0;

            const congName = ev.congregacao_id ? congregacoes.get(ev.congregacao_id)?.nome ?? "—" : "—";
            const title = ev.titulo?.trim() ? ev.titulo : "Culto";

            const hasEscala = !!escala;
            const hasEquipa = pessoas > 0;

            const badgeNode = !hasEscala
              ? badge("Sem escala", "neutral")
              : !hasEquipa
                ? badge("Sem equipa", "warn")
                : badge(`${pessoas} pessoa(s)`, "ok");

            const btnDisabled = creatingForEvento[ev.id] === true;

            return (
              <div
                key={ev.id}
                style={{
                  border: "1px solid #333",
                  borderRadius: 18,
                  background: "#0b0b0b",
                  padding: 16,
                  display: "grid",
                  gap: 10
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{title}</div>

                  {hasEscala ? (
                    <button
                      onClick={() => router.push(`/escalas/${escala.id}`)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 14,
                        border: "1px solid #444",
                        background: "#111",
                        color: "#fff"
                      }}
                    >
                      Gerir escala
                    </button>
                  ) : (
                    <button
                      disabled={btnDisabled}
                      onClick={() => createEscalaForEvento(ev.id)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 14,
                        border: "1px solid #444",
                        background: btnDisabled ? "#222" : "#111",
                        color: "#fff"
                      }}
                    >
                      Criar escala
                    </button>
                  )}
                </div>

                <div style={{ opacity: 0.9 }}>{fmtLisbon(ev.starts_at)}</div>
                <div style={{ opacity: 0.8 }}>Congregação: {congName}</div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {badgeNode}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </main>
  );
}