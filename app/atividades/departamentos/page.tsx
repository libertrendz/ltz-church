"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/client";

type DepartamentoRow = { id: string; nome: string; ativo: boolean };
type AtividadeRow = { id: string; nome: string; ativo: boolean; recorrente: boolean; descricao: string | null };
type PivotRow = { atividade_id: string; departamento_id: string };

export default function AtividadesDepartamentosPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [departamentos, setDepartamentos] = useState<DepartamentoRow[]>([]);
  const [atividades, setAtividades] = useState<AtividadeRow[]>([]);
  const [pivot, setPivot] = useState<PivotRow[]>([]);

  const [selectedAtividadeId, setSelectedAtividadeId] = useState<string | null>(null);
  const [draftDepIds, setDraftDepIds] = useState<Set<string>>(new Set());

  async function requireSessionOrRedirect() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.replace("/login");
      return false;
    }
    return true;
  }

  const depsByAtividade = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of pivot) {
      const list = m.get(p.atividade_id) ?? [];
      list.push(p.departamento_id);
      m.set(p.atividade_id, list);
    }
    return m;
  }, [pivot]);

  const depNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of departamentos) m.set(d.id, d.nome);
    return m;
  }, [departamentos]);

  const departamentosAtivos = useMemo(
    () => departamentos.filter((d) => d.ativo).sort((a, b) => a.nome.localeCompare(b.nome)),
    [departamentos]
  );

  const atividadesAtivas = useMemo(() => {
    const list = [...atividades].filter((a) => a.ativo);
    list.sort((a, b) => a.nome.localeCompare(b.nome));
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((a) => a.nome.toLowerCase().includes(t));
  }, [atividades, q]);

  const selectedAtividade = useMemo(
    () => atividades.find((a) => a.id === selectedAtividadeId) ?? null,
    [atividades, selectedAtividadeId]
  );

  async function loadAll() {
    setBusy(true);
    setErr(null);

    const okSession = await requireSessionOrRedirect();
    if (!okSession) return;

    const depRes = await supabase
      .from("departamentos")
      .select("id, nome, ativo")
      .order("nome", { ascending: true });

    if (depRes.error) {
      setErr(depRes.error.message);
      setBusy(false);
      return;
    }

    const atvRes = await supabase
      .from("atividades")
      .select("id, nome, ativo, recorrente, descricao")
      .order("nome", { ascending: true });

    if (atvRes.error) {
      setErr(atvRes.error.message);
      setBusy(false);
      return;
    }

    const pivRes = await supabase
      .from("atividades_departamentos")
      .select("atividade_id, departamento_id");

    if (pivRes.error) {
      setErr(pivRes.error.message);
      setBusy(false);
      return;
    }

    setDepartamentos((depRes.data as DepartamentoRow[]) ?? []);
    setAtividades((atvRes.data as AtividadeRow[]) ?? []);
    setPivot((pivRes.data as PivotRow[]) ?? []);

    setBusy(false);
  }

  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await loadAll();
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando escolhe atividade: prepara draft com deps atuais
  useEffect(() => {
    setOk(null);
    setErr(null);

    if (!selectedAtividadeId) {
      setDraftDepIds(new Set());
      return;
    }

    const current = depsByAtividade.get(selectedAtividadeId) ?? [];
    setDraftDepIds(new Set(current));
  }, [selectedAtividadeId, depsByAtividade]);

  function toggleDraft(depId: string) {
    setDraftDepIds((prev) => {
      const next = new Set(prev);
      if (next.has(depId)) next.delete(depId);
      else next.add(depId);
      return next;
    });
  }

  function closeDrawer() {
    setSelectedAtividadeId(null);
  }

  async function save() {
    if (!selectedAtividadeId) return;

    setSaving(true);
    setErr(null);
    setOk(null);

    const current = new Set(depsByAtividade.get(selectedAtividadeId) ?? []);
    const selected = new Set(draftDepIds);

    const toAdd: string[] = [];
    const toRemove: string[] = [];

    for (const dep of selected) if (!current.has(dep)) toAdd.push(dep);
    for (const dep of current) if (!selected.has(dep)) toRemove.push(dep);

    if (toAdd.length === 0 && toRemove.length === 0) {
      setSaving(false);
      setOk("Sem alterações.");
      return;
    }

    for (const depId of toAdd) {
      const { error } = await supabase.rpc("add_atividade_to_departamento", {
        p_atividade_id: selectedAtividadeId,
        p_departamento_id: depId
      });
      if (error) {
        setSaving(false);
        setErr(error.message);
        return;
      }
    }

    for (const depId of toRemove) {
      const { error } = await supabase.rpc("remove_atividade_from_departamento", {
        p_atividade_id: selectedAtividadeId,
        p_departamento_id: depId
      });
      if (error) {
        setSaving(false);
        setErr(error.message);
        return;
      }
    }

    await loadAll();
    setSaving(false);
    setOk("Guardado.");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ marginTop: 0 }}>Departamentos por Atividade</h1>

      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Selecciona uma atividade (tipo) e escolhe os departamentos envolvidos. (Fase 1)
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Procurar atividade…"
          style={{
            padding: 10,
            borderRadius: 12,
            border: "1px solid #333",
            background: "#111",
            color: "#fff",
            minWidth: 260
          }}
        />

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

      {!busy ? (
        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {atividadesAtivas.map((a) => {
            const depIds = depsByAtividade.get(a.id) ?? [];
            const depNames = depIds.map((id) => depNameById.get(id)).filter(Boolean) as string[];

            const selected = a.id === selectedAtividadeId;

            return (
              <button
                key={a.id}
                onClick={() => setSelectedAtividadeId(a.id)}
                style={{
                  textAlign: "left",
                  width: "100%",
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid #333",
                  background: selected ? "#151515" : "#0b0b0b",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>{a.nome}</div>
                    <div style={{ opacity: 0.8, marginTop: 4 }}>
                      {a.descricao ?? "—"} | {a.recorrente ? "Recorrente" : "Não recorrente"}
                    </div>
                    <div style={{ opacity: 0.85, marginTop: 6 }}>
                      <strong>Departamentos:</strong> {depNames.length ? depNames.join(", ") : "—"}
                    </div>
                  </div>
                  <div style={{ opacity: 0.9, alignSelf: "center" }}>{selected ? "Editar" : "Abrir"}</div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedAtividade ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            padding: 16
          }}
          onClick={closeDrawer}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(900px, 100%)",
              background: "#0b0b0b",
              border: "1px solid #333",
              borderRadius: 18,
              padding: 16,
              color: "#fff"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>{selectedAtividade.nome}</div>
                <div style={{ opacity: 0.8, marginTop: 4 }}>Selecciona departamentos e guarda.</div>
              </div>

              <button
                onClick={closeDrawer}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #444",
                  background: "#111",
                  color: "#fff",
                  cursor: "pointer"
                }}
              >
                Fechar
              </button>
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {departamentosAtivos.length === 0 ? <p>Sem departamentos ativos.</p> : null}

              {departamentosAtivos.map((d) => {
                const checked = draftDepIds.has(d.id);
                return (
                  <label
                    key={d.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid #333",
                      background: "#111",
                      cursor: "pointer"
                    }}
                  >
                    <input type="checkbox" checked={checked} onChange={() => toggleDraft(d.id)} />
                    <span style={{ fontWeight: 700 }}>{d.nome}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center" }}>
              <button
                onClick={closeDrawer}
                disabled={saving}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #444",
                  background: "#111",
                  color: "#fff",
                  cursor: saving ? "not-allowed" : "pointer"
                }}
              >
                Cancelar
              </button>

              <button
                onClick={save}
                disabled={saving}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #444",
                  background: saving ? "#222" : "#0f2a12",
                  color: "#fff",
                  cursor: saving ? "not-allowed" : "pointer"
                }}
              >
                {saving ? "A guardar…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
