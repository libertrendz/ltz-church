/* PATH: app/escalas/[escalaId]/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/client";

type FuncaoRow = { id: string; nome: string };
type MembroRow = { id: string; nome: string; ativo: boolean };

type EscalaRow = {
  id: string;
  evento_id: string | null;
  titulo: string | null;
  notas: string | null;
  ativo: boolean;
};

type EventoRow = {
  id: string;
  starts_at: string | null;
  titulo: string | null;
  status: "agendado" | "cancelado";
};

type ItemRow = {
  id: string;
  funcao_id: string;
  membro_id: string;
  status: "confirmado" | "pendente" | "cancelado";
  notas: string | null;
};

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

export default function EscalaDetailPage() {
  const router = useRouter();
  const params = useParams<{ escalaId: string }>();
  const escalaId = params.escalaId;

  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [escala, setEscala] = useState<EscalaRow | null>(null);
  const [evento, setEvento] = useState<EventoRow | null>(null);

  const [funcoes, setFuncoes] = useState<FuncaoRow[]>([]);
  const [membros, setMembros] = useState<MembroRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);

  const [funcaoId, setFuncaoId] = useState("");
  const [membroId, setMembroId] = useState("");
  const [status, setStatus] = useState<ItemRow["status"]>("confirmado");
  const [notas, setNotas] = useState("");

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

    const escalaRes = await supabase
      .from("escalas")
      .select("id, evento_id, titulo, notas, ativo")
      .eq("id", escalaId)
      .single();

    if (escalaRes.error) {
      setErr(escalaRes.error.message);
      setBusy(false);
      return;
    }

    const s = escalaRes.data as EscalaRow;
    setEscala(s);

    if (s.evento_id) {
      const evRes = await supabase
        .from("agenda_eventos")
        .select("id, starts_at, titulo, status")
        .eq("id", s.evento_id)
        .single();

      if (evRes.error) {
        setErr(evRes.error.message);
        setBusy(false);
        return;
      }
      setEvento(evRes.data as EventoRow);
    } else {
      setEvento(null);
    }

    // Funções: não assumir coluna ativa/ativo — só id/nome
    const fRes = await supabase.from("funcoes").select("id, nome").order("nome", { ascending: true });
    if (fRes.error) {
      setErr(fRes.error.message);
      setBusy(false);
      return;
    }
    setFuncoes((fRes.data as FuncaoRow[]) ?? []);

    // Membros: aqui já sabemos que existe "ativo"
    const mRes = await supabase.from("membros").select("id, nome, ativo").order("nome", { ascending: true });
    if (mRes.error) {
      setErr(mRes.error.message);
      setBusy(false);
      return;
    }
    setMembros((mRes.data as MembroRow[]) ?? []);

    const iRes = await supabase
      .from("escala_itens")
      .select("id, funcao_id, membro_id, status, notas")
      .eq("escala_id", escalaId)
      .order("created_at", { ascending: true });

    if (iRes.error) {
      setErr(iRes.error.message);
      setBusy(false);
      return;
    }

    setItems((iRes.data as ItemRow[]) ?? []);
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
  }, [escalaId]);

  const funcaoName = useMemo(() => {
    const m = new Map<string, string>();
    for (const f of funcoes) m.set(f.id, f.nome);
    return m;
  }, [funcoes]);

  const membroName = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of membros) m.set(x.id, x.nome);
    return m;
  }, [membros]);

  async function addItem() {
    setSaving(true);
    setErr(null);
    setOk(null);

    if (!funcaoId) {
      setSaving(false);
      setErr("Seleciona a função.");
      return;
    }
    if (!membroId) {
      setSaving(false);
      setErr("Seleciona o membro.");
      return;
    }

    const { error } = await supabase.from("escala_itens").insert({
      escala_id: escalaId,
      funcao_id: funcaoId,
      membro_id: membroId,
      status,
      notas: notas.trim() ? notas.trim() : null
    });

    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setOk("Item adicionado.");
    setFuncaoId("");
    setMembroId("");
    setStatus("confirmado");
    setNotas("");
    await load();
  }

  async function removeItem(itemId: string) {
    setErr(null);
    setOk(null);

    const { error } = await supabase.from("escala_itens").delete().eq("id", itemId);
    if (error) {
      setErr(error.message);
      return;
    }

    setOk("Item removido.");
    await load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const membrosAtivos = membros.filter((m) => m.ativo);

  return (
    <main style={{ padding: 24, maxWidth: 1100, color: "#fff" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <a href="/escalas" style={{ color: "#fff", opacity: 0.9, textDecoration: "underline" }}>
          ← Voltar
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

      <h1 style={{ marginTop: 16 }}>Escala</h1>

      {busy ? <p style={{ marginTop: 10 }}>A carregar…</p> : null}
      {err ? <p style={{ marginTop: 10, color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{err}</p> : null}

      {!busy && escala ? (
        <>
          <div style={{ marginTop: 12, padding: 16, borderRadius: 16, border: "1px solid #333", background: "#0b0b0b" }}>
            <div style={{ fontWeight: 900 }}>
              {evento ? `${fmtLisbon(evento.starts_at)} · ${evento.titulo ?? "Evento"}` : "Evento: —"}
              {evento?.status === "cancelado" ? <span style={{ opacity: 0.8 }}> (cancelado)</span> : null}
            </div>
            <div style={{ marginTop: 6, opacity: 0.85 }}>
              Escala ID: <span style={{ opacity: 0.95 }}>{escala.id}</span>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: 16, borderRadius: 16, border: "1px solid #333", background: "#0b0b0b" }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Adicionar item</h2>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", maxWidth: 900 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Função</span>
                <select
                  value={funcaoId}
                  onChange={(e) => setFuncaoId(e.target.value)}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
                >
                  <option value="">—</option>
                  {funcoes.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>Membro</span>
                <select
                  value={membroId}
                  onChange={(e) => setMembroId(e.target.value)}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
                >
                  <option value="">—</option>
                  {membrosAtivos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr", maxWidth: 900, marginTop: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span>Estado</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ItemRow["status"])}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
                >
                  <option value="confirmado">confirmado</option>
                  <option value="pendente">pendente</option>
                  <option value="cancelado">cancelado</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span>Notas (opcional)</span>
                <input
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
                />
              </label>
            </div>

            <button
              onClick={addItem}
              disabled={saving}
              style={{
                marginTop: 12,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #444",
                background: saving ? "#222" : "#111",
                color: "#fff",
                cursor: saving ? "not-allowed" : "pointer",
                width: 180
              }}
            >
              {saving ? "A gravar…" : "Adicionar"}
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            <h2 style={{ fontSize: 18 }}>Itens</h2>

            {items.length === 0 ? <p>Sem itens.</p> : null}

            {items.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {items.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      border: "1px solid #333",
                      background: "#0b0b0b",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900 }}>
                        {funcaoName.get(it.funcao_id) ?? "Função —"} · {membroName.get(it.membro_id) ?? "Membro —"}
                      </div>
                      <div style={{ opacity: 0.85, marginTop: 4 }}>
                        Estado: {it.status}
                        {it.notas ? ` · Notas: ${it.notas}` : ""}
                      </div>
                    </div>

                    <button
                      onClick={() => removeItem(it.id)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid #444",
                        background: "#2a0f0f",
                        color: "#fff",
                        cursor: "pointer",
                        minWidth: 120
                      }}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </main>
  );
}
