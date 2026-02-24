/* PATH: app/escalas/[escalaId]/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/client";

type EscalaRow = { id: string; evento_id: string | null; igreja_id: string | null };
type EventoRow = { id: string; starts_at: string | null; titulo: string | null; atividade_id: string | null };

type FuncaoRow = { id: string; nome: string };
type MembroRow = { id: string; nome: string | null };

type ItemRow = {
  id: string;
  funcao_id: string | null;
  membro_id: string;
  status: string | null;
  notas: string | null;
  membros?: { id: string; nome: string | null }[] | null;
};

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

function labelPessoa(m: { id: string; nome: string | null }) {
  return (m.nome && m.nome.trim()) || m.id;
}

export default function EscalaDetalhePage() {
  const router = useRouter();
  const params = useParams<{ escalaId: string }>();
  const escalaId = params.escalaId;

  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [escala, setEscala] = useState<EscalaRow | null>(null);
  const [evento, setEvento] = useState<EventoRow | null>(null);

  const [funcoes, setFuncoes] = useState<FuncaoRow[]>([]);
  const [membros, setMembros] = useState<MembroRow[]>([]);
  const [itens, setItens] = useState<ItemRow[]>([]);

  const [addOpen, setAddOpen] = useState<Record<string, boolean>>({});
  const [pickMembro, setPickMembro] = useState<Record<string, string>>({});
  const [pickStatus, setPickStatus] = useState<Record<string, string>>({});
  const [pickNotas, setPickNotas] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [removing, setRemoving] = useState<Record<string, boolean>>({});

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

    const esRes = await supabase
      .from("escalas")
      .select("id, evento_id, igreja_id")
      .eq("id", escalaId)
      .single();

    if (esRes.error) {
      setErr(esRes.error.message);
      setBusy(false);
      return;
    }
    const escalaRow = esRes.data as EscalaRow;
    setEscala(escalaRow);

    if (!escalaRow.evento_id) {
      setErr("Escala sem evento associado.");
      setBusy(false);
      return;
    }

    const evRes = await supabase
      .from("agenda_eventos")
      .select("id, starts_at, titulo, atividade_id")
      .eq("id", escalaRow.evento_id)
      .single();

    if (evRes.error) {
      setErr(evRes.error.message);
      setBusy(false);
      return;
    }
    const eventoRow = evRes.data as EventoRow;
    setEvento(eventoRow);

    // Funções “disponíveis” para esta atividade (defaults activos)
    if (eventoRow.atividade_id) {
      const fRes = await supabase
        .from("atividade_funcoes_defaults")
        .select("funcao_id, funcoes:funcao_id(id, nome)")
        .eq("atividade_id", eventoRow.atividade_id)
        .eq("ativo", true);

      if (fRes.error) {
        setErr(fRes.error.message);
        setBusy(false);
        return;
      }

      const fs: FuncaoRow[] =
        (fRes.data ?? [])
          .map((r: any) => (r.funcoes ? { id: r.funcoes.id, nome: r.funcoes.nome } : null))
          .filter(Boolean) ?? [];

      // ordena por nome
      fs.sort((a, b) => a.nome.localeCompare(b.nome, "pt-PT"));
      setFuncoes(fs);
    } else {
      setFuncoes([]);
    }

    // Itens já atribuídos (por função)
    const itRes = await supabase
      .from("escala_itens")
      .select("id, funcao_id, membro_id, status, notas, membros:membro_id(id, nome)")
      .eq("escala_id", escalaId);

    if (itRes.error) {
      setErr(itRes.error.message);
      setBusy(false);
      return;
    }
    setItens(((itRes.data as unknown) as ItemRow[]) ?? []);

    // Membros para dropdown
    const memRes = await supabase.from("membros").select("id, nome").order("nome", { ascending: true }).limit(500);
    if (memRes.error) {
      setErr(memRes.error.message);
      setBusy(false);
      return;
    }
    setMembros((memRes.data as MembroRow[]) ?? []);

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

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const itemsByFuncao = useMemo(() => {
    const m = new Map<string, ItemRow[]>();
    for (const it of itens) {
      const fid = it.funcao_id ?? "sem-funcao";
      if (!m.has(fid)) m.set(fid, []);
      m.get(fid)!.push(it);
    }
    return m;
  }, [itens]);

  function isOpen(funcaoId: string) {
    return !!addOpen[funcaoId];
  }

  async function addPessoa(funcao: FuncaoRow) {
    const funcaoId = funcao.id;
    const membroId = pickMembro[funcaoId];
    if (!membroId) {
      setErr("Seleciona um membro.");
      return;
    }

    setSaving((p) => ({ ...p, [funcaoId]: true }));
    setErr(null);
    setOk(null);

    const status = (pickStatus[funcaoId] ?? "confirmado").trim() || "confirmado";
    const notas = (pickNotas[funcaoId] ?? "").trim() || null;

    const res = await supabase.rpc("add_member_to_funcao", {
      p_escala_id: escalaId,
      p_funcao_id: funcaoId,
      p_membro_id: membroId,
      p_status: status,
      p_notas: notas
    });

    setSaving((p) => ({ ...p, [funcaoId]: false }));

    if (res.error) {
      // no telemóvel fica difícil “Failed to fetch”; isto garante mensagem útil
      setErr(res.error.message);
      return;
    }

    setOk("Adicionado.");
    setPickMembro((p) => ({ ...p, [funcaoId]: "" }));
    setPickNotas((p) => ({ ...p, [funcaoId]: "" }));
    setAddOpen((p) => ({ ...p, [funcaoId]: false }));
    await load();
  }

  async function removerItem(itemId: string) {
    setRemoving((p) => ({ ...p, [itemId]: true }));
    setErr(null);
    setOk(null);

    const res = await supabase.rpc("remove_escala_item", { p_item_id: itemId });

    setRemoving((p) => ({ ...p, [itemId]: false }));

    if (res.error) {
      setErr(res.error.message);
      return;
    }

    setOk("Removido.");
    await load();
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, color: "#fff" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <a href="/cultos" style={{ color: "#fff", opacity: 0.9, textDecoration: "underline" }}>
          Cultos & Escalas
        </a>
        <a href="/agenda" style={{ color: "#fff", opacity: 0.9, textDecoration: "underline" }}>
          Agenda
        </a>
        <button
          onClick={logout}
          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #444", background: "#111", color: "#fff" }}
        >
          Sair
        </button>
        {ok ? <span style={{ color: "#7CFF7C" }}>{ok}</span> : null}
      </div>

      <h1 style={{ marginTop: 14 }}>Equipa do Culto</h1>

      {busy ? <p>A carregar…</p> : null}
      {err ? <p style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{err}</p> : null}

      {!busy ? (
        <div style={{ marginTop: 12, padding: 14, borderRadius: 16, border: "1px solid #333", background: "#0b0b0b" }}>
          <div style={{ fontWeight: 900 }}>
            {evento?.starts_at ? `${fmtLisbon(evento.starts_at)} · ${evento.titulo ?? "Culto"}` : "Culto —"}
          </div>
          <div style={{ opacity: 0.8, marginTop: 4 }}>Escala ID: {escala?.id}</div>
        </div>
      ) : null}

      {!busy ? (
        <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
          {funcoes.length === 0 ? (
            <div style={{ padding: 14, borderRadius: 16, border: "1px solid #333", background: "#0b0b0b", opacity: 0.9 }}>
              Não há funções activas para este tipo de evento. (Define em “defaults” da actividade.)
            </div>
          ) : null}

          {funcoes.map((f) => {
            const list = itemsByFuncao.get(f.id) ?? [];
            const savingThis = !!saving[f.id];

            return (
              <section key={f.id} style={{ border: "1px solid #333", borderRadius: 16, background: "#0b0b0b" }}>
                <div style={{ padding: 12, borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{f.nome}</div>
                  <div style={{ opacity: 0.85 }}>{list.length} pessoa(s)</div>
                </div>

                <div style={{ padding: 12, display: "grid", gap: 10 }}>
                  {list.length === 0 ? <div style={{ opacity: 0.75 }}>Vazio</div> : null}

                  {list.map((it) => {
                    const m = it.membros && it.membros.length > 0 ? it.membros[0] : null;
                    const name = m ? labelPessoa({ id: m.id, nome: m.nome }) : it.membro_id;
                    const removingThis = !!removing[it.id];

                    return (
                      <div
                        key={it.id}
                        style={{
                          border: "1px solid #333",
                          borderRadius: 14,
                          padding: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center"
                        }}
                      >
                        <div style={{ display: "grid", gap: 4 }}>
                          <div style={{ fontWeight: 800 }}>{name}</div>
                          <div style={{ opacity: 0.8, fontSize: 13 }}>
                            {it.status ? `Status: ${it.status}` : null}
                            {it.status && it.notas ? " · " : null}
                            {it.notas ? `Notas: ${it.notas}` : null}
                          </div>
                        </div>

                        <button
                          onClick={() => removerItem(it.id)}
                          disabled={removingThis}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: "1px solid #444",
                            background: removingThis ? "#222" : "#2a0f0f",
                            color: "#fff"
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    );
                  })}

                  {!isOpen(f.id) ? (
                    <button
                      onClick={() => setAddOpen((p) => ({ ...p, [f.id]: true }))}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid #444",
                        background: "#111",
                        color: "#fff",
                        width: "fit-content"
                      }}
                    >
                      + Adicionar pessoa
                    </button>
                  ) : (
                    <div style={{ border: "1px solid #333", borderRadius: 14, padding: 12, display: "grid", gap: 10 }}>
                      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span>Membro</span>
                          <select
                            value={pickMembro[f.id] ?? ""}
                            onChange={(e) => setPickMembro((p) => ({ ...p, [f.id]: e.target.value }))}
                            style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
                          >
                            <option value="">—</option>
                            {membros.map((m) => (
                              <option key={m.id} value={m.id}>
                                {labelPessoa({ id: m.id, nome: m.nome })}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label style={{ display: "grid", gap: 6 }}>
                          <span>Status</span>
                          <select
                            value={pickStatus[f.id] ?? "confirmado"}
                            onChange={(e) => setPickStatus((p) => ({ ...p, [f.id]: e.target.value }))}
                            style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
                          >
                            <option value="confirmado">confirmado</option>
                            <option value="pendente">pendente</option>
                          </select>
                        </label>

                        <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
                          <span>Notas (opcional)</span>
                          <input
                            value={pickNotas[f.id] ?? ""}
                            onChange={(e) => setPickNotas((p) => ({ ...p, [f.id]: e.target.value }))}
                            style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
                          />
                        </label>
                      </div>

                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          onClick={() => addPessoa(f)}
                          disabled={savingThis}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: "1px solid #444",
                            background: savingThis ? "#222" : "#0f2a12",
                            color: "#fff"
                          }}
                        >
                          Adicionar
                        </button>

                        <button
                          onClick={() => setAddOpen((p) => ({ ...p, [f.id]: false }))}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: "1px solid #444",
                            background: "#111",
                            color: "#fff"
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </main>
  );
}