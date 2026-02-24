/* PATH: app/cultos/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

type EventoRow = {
  id: string;
  starts_at: string | null;
  titulo: string | null;
  status: "agendado" | "cancelado";
  congregacao_id: string | null;
};

type CongregacaoRow = { id: string; nome: string };
type EscalaRow = { id: string; evento_id: string | null };
type SlotRow = { escala_id: string; status: string };

function fmtLisbon(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

function badgeFor(filled: number, total: number) {
  if (total === 0) return { text: "Sem slots", color: "#777", bg: "#111" };
  if (filled === 0) return { text: "Vazia", color: "#ffb86b", bg: "#2a1a0f" };
  if (filled >= total) return { text: "Completa", color: "#7CFF7C", bg: "#0f2a12" };
  return { text: "Em falta", color: "#ffd56b", bg: "#2a240f" };
}

export default function CultosHubPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [cultoAtividadeId, setCultoAtividadeId] = useState<string | null>(null);
  const [eventos, setEventos] = useState<EventoRow[]>([]);
  const [congregacoes, setCongregacoes] = useState<Map<string, string>>(new Map());
  const [escalaByEvento, setEscalaByEvento] = useState<Map<string, string>>(new Map());
  const [slotsCount, setSlotsCount] = useState<Map<string, { total: number; filled: number }>>(new Map());

  async function requireSessionOrRedirect() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.replace("/login");
      return false;
    }
    return true;
  }

  async function load() {
    setBusy(true);
    setErr(null);
    setOk(null);

    const okSession = await requireSessionOrRedirect();
    if (!okSession) return;

    // 1) Culto atividade_id por nome
    const atv = await supabase
      .from("atividades")
      .select("id, nome")
      .ilike("nome", "culto")
      .limit(1);

    if (atv.error) {
      setErr(atv.error.message);
      setBusy(false);
      return;
    }

    const cultoId = (atv.data?.[0]?.id as string | undefined) ?? null;
    setCultoAtividadeId(cultoId);

    if (!cultoId) {
      setErr('Atividade "Culto" não encontrada. Confirma em /atividades.');
      setBusy(false);
      return;
    }

    // 2) Eventos futuros do tipo Culto (Lisboa)
    const nowIso = new Date().toISOString();
    const evRes = await supabase
      .from("agenda_eventos")
      .select("id, starts_at, titulo, status, congregacao_id, atividade_id")
      .eq("atividade_id", cultoId)
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(60);

    if (evRes.error) {
      setErr(evRes.error.message);
      setBusy(false);
      return;
    }

    const evs = (evRes.data as any[] | null) ?? [];
    const evClean: EventoRow[] = evs.map((e) => ({
      id: e.id,
      starts_at: e.starts_at,
      titulo: e.titulo,
      status: e.status,
      congregacao_id: e.congregacao_id
    }));
    setEventos(evClean);

    // Pré-carregar nomes das congregações usadas
    const congregacaoIds = Array.from(new Set(evClean.map((e) => e.congregacao_id).filter(Boolean))) as string[];
    if (congregacaoIds.length > 0) {
      const conRes = await supabase
        .from("congregacoes")
        .select("id, nome")
        .in("id", congregacaoIds);

      if (conRes.error) {
        setErr(conRes.error.message);
        setBusy(false);
        return;
      }

      const map = new Map<string, string>();
      (conRes.data as CongregacaoRow[]).forEach((c) => map.set(c.id, c.nome));
      setCongregacoes(map);
    } else {
      setCongregacoes(new Map());
    }

    // 3) Escalas desses eventos
    const eventoIds = evClean.map((e) => e.id);
    if (eventoIds.length === 0) {
      setEscalaByEvento(new Map());
      setSlotsCount(new Map());
      setBusy(false);
      return;
    }

    const esRes = await supabase
      .from("escalas")
      .select("id, evento_id")
      .in("evento_id", eventoIds);

    if (esRes.error) {
      setErr(esRes.error.message);
      setBusy(false);
      return;
    }

    const escalaMap = new Map<string, string>();
    const escalas = (esRes.data as EscalaRow[] | null) ?? [];
    for (const s of escalas) {
      if (s.evento_id) escalaMap.set(s.evento_id, s.id);
    }
    setEscalaByEvento(escalaMap);

    // 4) Slots dessas escalas para calcular preenchimento
    const escalaIds = escalas.map((s) => s.id);
    if (escalaIds.length === 0) {
      setSlotsCount(new Map());
      setBusy(false);
      return;
    }

    const slRes = await supabase
      .from("escala_slots")
      .select("escala_id, status")
      .in("escala_id", escalaIds);

    if (slRes.error) {
      setErr(slRes.error.message);
      setBusy(false);
      return;
    }

    const slots = ((slRes.data as SlotRow[] | null) ?? []).filter((x) => x.escala_id);
    const countMap = new Map<string, { total: number; filled: number }>();
    for (const s of slots) {
      const prev = countMap.get(s.escala_id) ?? { total: 0, filled: 0 };
      prev.total += 1;
      // considerar preenchido apenas se status == 'fechado'
      if ((s.status ?? "").toLowerCase() === "fechado") prev.filled += 1;
      countMap.set(s.escala_id, prev);
    }
    // garantir escalas sem slots ficam com total 0
    for (const id of escalaIds) if (!countMap.has(id)) countMap.set(id, { total: 0, filled: 0 });

    setSlotsCount(countMap);
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

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function createEscalaForEvento(eventoId: string) {
    setErr(null);
    setOk(null);

    // Evitar duplo clique
    const existing = escalaByEvento.get(eventoId);
    if (existing) {
      router.push(`/escalas/${existing}`);
      return;
    }

    // Criar escala mínima (trigger vai gerar slots)
    const ins = await supabase
      .from("escalas")
      .insert({ evento_id: eventoId, ativo: true })
      .select("id")
      .single();

    if (ins.error) {
      setErr(ins.error.message);
      return;
    }

    const escalaId = ins.data?.id as string;
    setOk("Escala criada.");
    router.push(`/escalas/${escalaId}`);
  }

  return (
    <main style={{ padding: 24, maxWidth: 1000, color: "#fff" }}>
      <h1 style={{ marginTop: 0 }}>Cultos & Escalas</h1>
      <p style={{ opacity: 0.85, marginTop: 6 }}>Próximos cultos (Europe/Lisbon). Age por culto/evento, não por tabela.</p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
        <a href="/agenda" style={{ color: "#fff", opacity: 0.9, textDecoration: "underline" }}>
          Agenda
        </a>
        <a href="/escalas" style={{ color: "#fff", opacity: 0.9, textDecoration: "underline" }}>
          Escalas
        </a>

        <button
          onClick={logout}
          style={{
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

        {ok ? <span style={{ color: "#7CFF7C" }}>{ok}</span> : null}
      </div>

      {busy ? <p style={{ marginTop: 14 }}>A carregar…</p> : null}
      {err ? <p style={{ marginTop: 14, color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{err}</p> : null}

      {!busy && !err && eventos.length === 0 ? (
        <div style={{ marginTop: 16, padding: 16, borderRadius: 16, border: "1px solid #333", background: "#0b0b0b" }}>
          <b>Sem cultos próximos.</b>
        </div>
      ) : null}

      {!busy && eventos.length > 0 ? (
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {eventos.map((ev) => {
            const escalaId = escalaByEvento.get(ev.id) ?? null;
            const counts = escalaId ? slotsCount.get(escalaId) : null;
            const filled = counts?.filled ?? 0;
            const total = counts?.total ?? 0;
            const badge = escalaId ? badgeFor(filled, total) : { text: "Sem escala", color: "#cfcfcf", bg: "#111" };

            const congregacaoNome =
              ev.congregacao_id && congregacoes.has(ev.congregacao_id) ? congregacoes.get(ev.congregacao_id)! : "—";

            const titulo = ev.titulo?.trim() ? ev.titulo : "Culto";
            const isCancelled = ev.status === "cancelado";

            return (
              <section
                key={ev.id}
                style={{
                  padding: 16,
                  borderRadius: 16,
                  border: "1px solid #333",
                  background: "#0b0b0b",
                  opacity: isCancelled ? 0.65 : 1
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>
                      {titulo} {isCancelled ? <span style={{ opacity: 0.8 }}>(cancelado)</span> : null}
                    </div>
                    <div style={{ opacity: 0.85, marginTop: 4 }}>{fmtLisbon(ev.starts_at)}</div>
                    <div style={{ opacity: 0.85, marginTop: 4 }}>Congregação: {congregacaoNome}</div>

                    <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span
                        style={{
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: "1px solid #333",
                          background: badge.bg,
                          color: badge.color,
                          fontWeight: 800,
                          fontSize: 12
                        }}
                      >
                        {badge.text}
                      </span>

                      {escalaId ? (
                        <span style={{ opacity: 0.85, fontSize: 13 }}>
                          Preenchidos: <b>{filled}</b>/<b>{total}</b>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {escalaId ? (
                      <a
                        href={`/escalas/${escalaId}`}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 12,
                          border: "1px solid #444",
                          background: "#111",
                          color: "#fff",
                          textDecoration: "none",
                          whiteSpace: "nowrap"
                        }}
                      >
                        Gerir escala
                      </a>
                    ) : (
                      <button
                        onClick={() => createEscalaForEvento(ev.id)}
                        disabled={isCancelled}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 12,
                          border: "1px solid #444",
                          background: isCancelled ? "#222" : "#111",
                          color: "#fff",
                          cursor: isCancelled ? "not-allowed" : "pointer",
                          whiteSpace: "nowrap"
                        }}
                      >
                        Criar escala
                      </button>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : null}

      {!busy && cultoAtividadeId ? (
        <p style={{ marginTop: 16, opacity: 0.6, fontSize: 12 }}>
          Debug: cultoAtividadeId = {cultoAtividadeId}
        </p>
      ) : null}
    </main>
  );
}
