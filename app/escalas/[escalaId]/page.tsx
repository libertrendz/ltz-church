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
  membros?: any; // join pode vir como objecto ou array
  funcoes?: any; // se vier join por funcao_id (opcional)
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

function pessoaLabel(id: string, nome: string | null) {
  return (nome && nome.trim()) || id;
}

function pickJoinOne(joined: any): any | null {
  if (!joined) return null;
  if (typeof joined === "object" && !Array.isArray(joined)) return joined;
  if (Array.isArray(joined) && joined.length > 0) return joined[0];
  return null;
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

  // UI
  const [showEmpty, setShowEmpty] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addFuncaoId, setAddFuncaoId] = useState<string>("");
  const [addMembroId, setAddMembroId] = useState<string>("");
  const [addStatus, setAddStatus] = useState<string>("confirmado");
  const [addNotas, setAddNotas] = useState<string>("");
  const [savingAdd, setSavingAdd] = useState(false);
  const [removingItem, setRemovingItem] = useState<Record<string, boolean>>({});

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
      setErr("Esta escala não tem evento associado.");
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

    // funções activas (defaults) para este tipo de evento
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

      const fs: FuncaoRow[] = ((fRes.data as any[]) ?? [])
        .map((r) => (r.funcoes ? { id: r.funcoes.id as string, nome: r.funcoes.nome as string } : null))
        .filter(Boolean) as FuncaoRow[];

      fs.sort((a, b) => a.nome.localeCompare(b.nome, "pt-PT"));
      setFuncoes(fs);

      // default do formulário: primeira função
      if (!addFuncaoId && fs.length > 0) setAddFuncaoId(fs[0].id);
    } else {
      setFuncoes([]);
    }

    // itens (equipa)
    const itRes = await supabase
      .from("escala_itens")
      .select("id, funcao_id, membro_id, status, notas, membros:membro_id(id, nome)")
      .eq("escala_id", escalaId);

    if (itRes.error) {
      setErr(itRes.error.message);
      setBusy(false);
      return;
    }
    setItens((itRes.data as unknown as ItemRow[]) ?? []);

    // membros (dropdown)
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
    let alive = true;
    (async () => {
      if (!alive) return;
      await load();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escalaId]);

  const funcaoById = useMemo(() => {
    const m = new Map<string, FuncaoRow>();
    for (const f of funcoes) m.set(f.id, f);
    return m;
  }, [funcoes]);

  const itemsByFuncao = useMemo(() => {
    const m = new Map<string, ItemRow[]>();
    for (const it of itens) {
      const fid = it.funcao_id;
      if (!fid) continue;
      if (!m.has(fid)) m.set(fid, []);
      m.get(fid)!.push(it);
    }
    // ordenar por nome da pessoa (quando possível)
    for (const [fid, list] of m.entries()) {
      list.sort((a, b) => {
        const ma = pickJoinOne(a.membros);
        const mb = pickJoinOne(b.membros);
        const na = (ma?.nome ?? "").toString();
        const nb = (mb?.nome ?? "").toString();
        return na.localeCompare(nb, "pt-PT");
      });
      m.set(fid, list);
    }
    return m;
  }, [itens]);

  const visibleFuncaoIds = useMemo(() => {
    if (showEmpty) return funcoes.map((f) => f.id);
    return Array.from(itemsByFuncao.keys());
  }, [funcoes, showEmpty, itemsByFuncao]);

  async function addPessoa() {
    if (!addFuncaoId) {
      setErr("Seleciona uma função.");
      return;
    }
    if (!addMembroId) {
      setErr("Seleciona um membro.");
      return;
    }

    setSavingAdd(true);
    setErr(null);
    setOk(null);

    const res = await supabase.rpc("add_member_to_funcao", {
      p_escala_id: escalaId,
      p_funcao_id: addFuncaoId,
      p_membro_id: addMembroId,
      p_status: (addStatus || "confirmado").trim(),
      p_notas: (addNotas.trim() || null) as any
    });

    setSavingAdd(false);

    if (res.error) {
      setErr(res.error.message || "Erro ao adicionar.");
      return;
    }

    setOk("Adicionado.");
    setAddMembroId("");
    setAddNotas("");
    setAddOpen(false);
    await load();
  }

  async function remover(itemId: string) {
    setRemovingItem((p) => ({ ...p, [itemId]: true }));
    setErr(null);
    setOk(null);

    const res = await supabase.rpc("remove_escala_item", { p_item_id: itemId });

    setRemovingItem((p) => ({ ...p, [itemId]: false }));

    if (res.error) {
      setErr(res.error.message || "Erro ao remover.");
      return;
    }

    setOk("Removido.");
    await load();
  }

  const totalPessoas = itens.length;

  return (
    <main style={{ padding: 18, maxWidth: 1100, margin: "0 auto", color: "#fff" }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <a href="/cultos" style={{ color: "#fff", textDecoration: "underline", opacity: 0.9 }}>
          Cultos & Escalas
        </a>
        <a href="/agenda" style={{ color: "#fff", textDecoration: "underline", opacity: 0.9 }}>
          Agenda
        </a>
        <span style={{ flex: 1 }} />
        <button
          onClick={logout}
          style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #444", background: "#111", color: "#fff" }}
        >
          Sair
        </button>
      </header>

      <h1 style={{ marginTop: 14, marginBottom: 6 }}>Equipa</h1>

      {busy ? <p>A carregar…</p> : null}
      {err ? <p style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{err}</p> : null}
      {ok ? <p style={{ color: "#7CFF7C" }}>{ok}</p> : null}

      {!busy ? (
        <section style={{ marginTop: 10, padding: 14, borderRadius: 16, border: "1px solid #333", background: "#0b0b0b" }}>
          <div style={{ fontWeight: 900 }}>
            {evento?.starts_at ? `${fmtLisbon(evento.starts_at)} · ${evento.titulo ?? "Culto"}` : (evento?.titulo ?? "Culto")}
          </div>
          <div style={{ opacity: 0.85, marginTop: 6 }}>
            Pessoas atribuídas: <b>{totalPessoas}</b>
          </div>
          <div style={{ opacity: 0.75, marginTop: 2 }}>Escala: {escala?.id}</div>

          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => setAddOpen(true)}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #444",
                background: "#111",
                color: "#fff"
              }}
            >
              + Adicionar pessoa
            </button>

            <label style={{ display: "flex", gap: 8, alignItems: "center", opacity: 0.9 }}>
              <input
                type="checkbox"
                checked={showEmpty}
                onChange={(e) => setShowEmpty(e.target.checked)}
              />
              Mostrar funções vazias
            </label>
          </div>
        </section>
      ) : null}

      {!busy && addOpen ? (
        <section style={{ marginTop: 14, border: "1px solid #333", borderRadius: 16, background: "#0b0b0b", padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Adicionar pessoa</div>

          {funcoes.length === 0 ? (
            <div style={{ opacity: 0.85 }}>
              Este tipo de evento não tem funções configuradas. (Admin: definir em defaults do tipo.)
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>Função</span>
                  <select
                    value={addFuncaoId}
                    onChange={(e) => setAddFuncaoId(e.target.value)}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
                  >
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
                    value={addMembroId}
                    onChange={(e) => setAddMembroId(e.target.value)}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
                  >
                    <option value="">—</option>
                    {membros.map((m) => (
                      <option key={m.id} value={m.id}>
                        {pessoaLabel(m.id, m.nome)}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>Status</span>
                  <select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value)}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
                  >
                    <option value="confirmado">confirmado</option>
                    <option value="pendente">pendente</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>Notas (opcional)</span>
                  <input
                    value={addNotas}
                    onChange={(e) => setAddNotas(e.target.value)}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #333", background: "#111", color: "#fff" }}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button
                  onClick={addPessoa}
                  disabled={savingAdd}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid #444",
                    background: savingAdd ? "#222" : "#0f2a12",
                    color: "#fff"
                  }}
                >
                  Adicionar
                </button>
                <button
                  onClick={() => setAddOpen(false)}
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
            </>
          )}
        </section>
      ) : null}

      {!busy ? (
        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          {visibleFuncaoIds.length === 0 ? (
            <div style={{ padding: 14, borderRadius: 16, border: "1px solid #333", background: "#0b0b0b", opacity: 0.9 }}>
              Ainda não há ninguém atribuído. Usa “Adicionar pessoa”.
            </div>
          ) : null}

          {visibleFuncaoIds.map((fid) => {
            const f = funcaoById.get(fid);
            const list = itemsByFuncao.get(fid) ?? [];
            const title = f?.nome ?? "Função";

            return (
              <section key={fid} style={{ border: "1px solid #333", borderRadius: 16, background: "#0b0b0b" }}>
                <div style={{ padding: 12, borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{title}</div>
                  <div style={{ opacity: 0.85 }}>{list.length} pessoa(s)</div>
                </div>

                <div style={{ padding: 12, display: "grid", gap: 10 }}>
                  {list.length === 0 ? <div style={{ opacity: 0.75 }}>Vazio</div> : null}

                  {list.map((it) => {
                    const m = pickJoinOne(it.membros);
                    const label = m ? pessoaLabel(m.id, m.nome ?? null) : it.membro_id;
                    const removing = !!removingItem[it.id];

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
                          <div style={{ fontWeight: 800 }}>{label}</div>
                          <div style={{ opacity: 0.8, fontSize: 13 }}>
                            {it.status ? `Status: ${it.status}` : null}
                            {it.status && it.notas ? " · " : null}
                            {it.notas ? `Notas: ${it.notas}` : null}
                          </div>
                        </div>

                        <button
                          onClick={() => remover(it.id)}
                          disabled={removing}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: "1px solid #444",
                            background: removing ? "#222" : "#2a0f0f",
                            color: "#fff"
                          }}
                        >
                          Remover
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </main>
  );
}
