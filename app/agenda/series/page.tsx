"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

type AtividadeRow = { id: string; nome: string; ativo: boolean };
type CongregacaoRow = { id: string; nome: string; ativa: boolean };

type EventoRow = {
  id: string;
  starts_at: string | null;
  ends_at: string | null;
  titulo: string | null;
  tema: string | null;
  status: "agendado" | "cancelado";
  publico: boolean;
  serie_id: string | null;
  atividade_id: string | null;
  congregacao_id: string | null;
};

function fmtDateTimeLisbon(iso: string | null) {
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

function toIsoFromLocal(dtLocal: string) {
  // dtLocal vem como "YYYY-MM-DDTHH:mm" (sem timezone).
  // Guardamos como ISO (o browser converte para UTC ao fazer new Date()).
  const d = new Date(dtLocal);
  return d.toISOString();
}

export default function AgendaEventosPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [atividades, setAtividades] = useState<AtividadeRow[]>([]);
  const [congregacoes, setCongregacoes] = useState<CongregacaoRow[]>([]);
  const [items, setItems] = useState<EventoRow[]>([]);

  // Form avulso
  const [atividadeId, setAtividadeId] = useState("");
  const [congregacaoId, setCongregacaoId] = useState("");
  const [startsLocal, setStartsLocal] = useState("");
  const [endsLocal, setEndsLocal] = useState("");
  const [titulo, setTitulo] = useState("");
  const [tema, setTema] = useState("");
  const [descricao, setDescricao] = useState("");
  const [publico, setPublico] = useState(true);

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

    const atvRes = await supabase
      .from("atividades")
      .select("id, nome, ativo")
      .order("nome", { ascending: true });

    if (atvRes.error) {
      setErr(atvRes.error.message);
      setBusy(false);
      return;
    }

    const conRes = await supabase
      .from("congregacoes")
      .select("id, nome, ativa")
      .order("nome", { ascending: true });

    if (conRes.error) {
      setErr(conRes.error.message);
      setBusy(false);
      return;
    }

    // Próximos eventos (inclui gerados e avulsos)
    const evRes = await supabase
      .from("agenda_eventos")
      .select(
        "id, starts_at, ends_at, titulo, tema, status, publico, serie_id, atividade_id, congregacao_id"
      )
      .order("starts_at", { ascending: true })
      .limit(200);

    if (evRes.error) {
      setErr(evRes.error.message);
      setBusy(false);
      return;
    }

    setAtividades((atvRes.data as AtividadeRow[]) ?? []);
    setCongregacoes((conRes.data as CongregacaoRow[]) ?? []);
    setItems((evRes.data as EventoRow[]) ?? []);
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

  const atividadeName = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of atividades) m.set(a.id, a.nome);
    return m;
  }, [atividades]);

  const congregacaoName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of congregacoes) m.set(c.id, c.nome);
    return m;
  }, [congregacoes]);

  async function createAvulso() {
    setSaving(true);
    setErr(null);
    setOk(null);

    if (!atividadeId) {
      setSaving(false);
      setErr("Seleciona a atividade (tipo).");
      return;
    }
    if (!startsLocal) {
      setSaving(false);
      setErr("Define a data/hora de início.");
      return;
    }

    const startsIso = toIsoFromLocal(startsLocal);
    const endsIso = endsLocal ? toIsoFromLocal(endsLocal) : null;

    const { data, error } = await supabase.rpc("create_agenda_evento", {
      p_atividade_id: atividadeId,
      p_starts_at: startsIso,
      p_congregacao_id: congregacaoId ? congregacaoId : null,
      p_ends_at: endsIso,
      p_titulo: titulo.trim() ? titulo.trim() : null,
      p_tema: tema.trim() ? tema.trim() : null,
      p_descricao: descricao.trim() ? descricao.trim() : null,
      p_publico: publico,
      p_status: "agendado"
    });

    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setOk(`Evento criado (id: ${data}).`);
    setTitulo("");
    setTema("");
    setDescricao("");
    setStartsLocal("");
    setEndsLocal("");
    setAtividadeId("");
    setCongregacaoId("");
    setPublico(true);

    await load();
  }

  async function cancelOrRestore(ev: EventoRow) {
    setErr(null);
    setOk(null);

    // Atualização direta (RLS protege por tenant)
    const next = ev.status === "agendado" ? "cancelado" : "agendado";

    const { error } = await supabase
      .from("agenda_eventos")
      .update({ status: next })
      .eq("id", ev.id);

    if (error) {
      setErr(error.message);
      return;
    }

    setOk(next === "cancelado" ? "Evento cancelado." : "Evento reativado.");
    await load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const atividadesAtivas = atividades.filter((a) => a.ativo);

  return (
    <main style={{ padding: 24, maxWidth: 1000 }}>
      <h1 style={{ marginTop: 0 }}>Agenda — Eventos</h1>

      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Aqui tens as instâncias concretas (inclui eventos gerados de séries e eventos avulsos).
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
        <a href="/agenda/series" style={{ color: "#fff", opacity: 0.9 }}>
          Gerir séries
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

      {/* Criar evento avulso */}
      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 16,
          border: "1px solid #333",
          background: "#0b0b0b",
          color: "#fff"
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Criar evento avulso</h2>
        <p style={{ opacity: 0.8, marginTop: 6 }}>
          Para reuniões e eventos pontuais (não recorrentes). Para recorrentes usa “Séries”.
        </p>

        <div style={{ display: "grid", gap: 12, maxWidth: 720 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Atividade (tipo)</span>
            <select
              value={atividadeId}
              onChange={(e) => setAtividadeId(e.target.value)}
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid #333",
                background: "#111",
                color: "#fff"
              }}
            >
              <option value="">—</option>
              {atividadesAtivas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Congregação (opcional)</span>
            <select
              value={congregacaoId}
              onChange={(e) => setCongregacaoId(e.target.value)}
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid #333",
                background: "#111",
                color: "#fff"
              }}
            >
              <option value="">—</option>
              {congregacoes
                .filter((c) => c.ativa)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </select>
          </label>

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Início (Lisboa)</span>
              <input
                type="datetime-local"
                value={startsLocal}
                onChange={(e) => setStartsLocal(e.target.value)}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #333",
                  background: "#111",
                  color: "#fff"
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Fim (opcional)</span>
              <input
                type="datetime-local"
                value={endsLocal}
                onChange={(e) => setEndsLocal(e.target.value)}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #333",
                  background: "#111",
                  color: "#fff"
                }}
              />
            </label>
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Título (opcional)</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Reunião Geral"
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid #333",
                background: "#111",
                color: "#fff"
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Tema (opcional)</span>
            <input
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Ex: Tema da noite"
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid #333",
                background: "#111",
                color: "#fff"
              }}
            />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Descrição (opcional)</span>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Observações"
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid #333",
                background: "#111",
                color: "#fff"
              }}
            />
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={publico} onChange={(e) => setPublico(e.target.checked)} />
            <span>Evento público</span>
          </label>

          <button
            onClick={createAvulso}
            disabled={saving}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #444",
              background: saving ? "#222" : "#111",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
              width: 200
            }}
          >
            {saving ? "A criar…" : "Criar evento"}
          </button>
        </div>
      </div>

      {/* Lista de eventos */}
      <div style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 18 }}>Próximos eventos</h2>

        {!busy && items.length === 0 ? <p>Sem eventos.</p> : null}

        {!busy && items.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((ev) => {
              const aName = ev.atividade_id ? atividadeName.get(ev.atividade_id) : "—";
              const cName = ev.congregacao_id ? congregacaoName.get(ev.congregacao_id) : "—";

              const label = ev.titulo?.trim()
                ? ev.titulo
                : aName
                ? `${aName}${ev.serie_id ? " (série)" : " (avulso)"}`
                : "Evento";

              return (
                <div
                  key={ev.id}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid #333",
                    background: "#0b0b0b",
                    color: "#fff",
                    opacity: ev.status === "cancelado" ? 0.7 : 1
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>
                        {label}{" "}
                        {ev.status === "cancelado" ? <span style={{ opacity: 0.8 }}>(cancelado)</span> : null}
                      </div>
                      <div style={{ opacity: 0.85, marginTop: 4 }}>
                        {fmtDateTimeLisbon(ev.starts_at)}
                        {ev.ends_at ? ` → ${fmtDateTimeLisbon(ev.ends_at)}` : ""} · Congregação: {cName}
                      </div>
                      {ev.tema ? <div style={{ opacity: 0.85, marginTop: 4 }}>Tema: {ev.tema}</div> : null}
                    </div>

                    <button
                      onClick={() => cancelOrRestore(ev)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid #444",
                        background: ev.status === "agendado" ? "#2a0f0f" : "#0f2a12",
                        color: "#fff",
                        cursor: "pointer",
                        minWidth: 160
                      }}
                    >
                      {ev.status === "agendado" ? "Cancelar" : "Reativar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}
