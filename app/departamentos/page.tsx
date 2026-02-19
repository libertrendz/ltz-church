"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/client";

type DepartamentoRow = { id: string; nome: string; ativo: boolean };
type MembroRow = { id: string; nome: string; voluntario: boolean; obreiro: boolean };
type AssocRow = { membro_id: string; departamento_id: string };

export default function MembrosDepartamentosPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [departamentos, setDepartamentos] = useState<DepartamentoRow[]>([]);
  const [membros, setMembros] = useState<MembroRow[]>([]);
  const [assocs, setAssocs] = useState<AssocRow[]>([]);

  const [selectedMembroId, setSelectedMembroId] = useState<string | null>(null);
  const [draftDepIds, setDraftDepIds] = useState<Set<string>>(new Set());

  const depNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of departamentos) m.set(d.id, d.nome);
    return m;
  }, [departamentos]);

  const depsByMembro = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const a of assocs) {
      const list = m.get(a.membro_id) ?? [];
      list.push(a.departamento_id);
      m.set(a.membro_id, list);
    }
    return m;
  }, [assocs]);

  const departamentosAtivos = useMemo(
    () => departamentos.filter((d) => d.ativo).sort((a, b) => a.nome.localeCompare(b.nome)),
    [departamentos]
  );

  const membrosFiltrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = [...membros].sort((a, b) => a.nome.localeCompare(b.nome));
    if (!t) return list;
    return list.filter((m) => m.nome.toLowerCase().includes(t));
  }, [membros, q]);

  const selectedMembro = useMemo(
    () => membros.find((m) => m.id === selectedMembroId) ?? null,
    [membros, selectedMembroId]
  );

  async function requireSessionOrRedirect() {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.replace("/login");
      return false;
    }
    return true;
  }

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

    const memRes = await supabase
      .from("membros")
      .select("id, nome, voluntario, obreiro")
      .order("nome", { ascending: true });

    if (memRes.error) {
      setErr(memRes.error.message);
      setBusy(false);
      return;
    }

    const assocRes = await supabase.from("membros_departamentos").select("membro_id, departamento_id");

    if (assocRes.error) {
      setErr(assocRes.error.message);
      setBusy(false);
      return;
    }

    setDepartamentos((depRes.data as DepartamentoRow[]) ?? []);
    setMembros((memRes.data as MembroRow[]) ?? []);
    setAssocs((assocRes.data as AssocRow[]) ?? []);

    setBusy(false);
  }

  // initial load
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

  // quando escolhe membro: preparar o draft (checkboxes) com os deps atuais
  useEffect(() => {
    setOk(null);
    setErr(null);
    if (!selectedMembroId) {
      setDraftDepIds(new Set());
      return;
    }
    const current = depsByMembro.get(selectedMembroId) ?? [];
    setDraftDepIds(new Set(current));
  }, [selectedMembroId, depsByMembro]);

  function toggleDraft(depId: string) {
    setDraftDepIds((prev) => {
      const next = new Set(prev);
      if (next.has(depId)) next.delete(depId);
      else next.add(depId);
      return next;
    });
  }

  function closeDrawer() {
    setSelectedMembroId(null);
  }

  async function save() {
    if (!selectedMembroId) return;

    setSaving(true);
    setErr(null);
    setOk(null);

    const current = new Set(depsByMembro.get(selectedMembroId) ?? []);
    const selected = new Set(draftDepIds);

    const toAdd: string[] = [];
    const toRemove: string[] = [];

    for (const dep of selected) if (!current.has(dep)) toAdd.push(dep);
    for (const dep of current) if (!selected.has(dep)) toRemove.push(dep);

    // nada a fazer
    if (toAdd.length === 0 && toRemove.length === 0) {
      setSaving(false);
      setOk("Sem alterações.");
      return;
    }

    // aplica alterações
    for (const depId of toAdd) {
      const { error } = await supabase.rpc("add_membro_to_departamento", {
        p_membro_id: selectedMembroId,
        p_departamento_id: depId
      });
      if (error) {
        setSaving(false);
        setErr(error.message);
        return;
      }
    }

    for (const depId of toRemove) {
      const { error } = await supabase.rpc("remove_membro_from_departamento", {
        p_membro_id: selectedMembroId,
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
      <h1 style={{ marginTop: 0 }}>Departamentos do Membro</h1>

      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Primeiro selecciona o membro. Depois, escolhe os departamentos e guarda. (Fase 1)
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Procurar membro…"
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
          {membrosFiltrados.map((m) => {
            const depIds = depsByMembro.get(m.id) ?? [];
            const depNames = depIds.map((id) => depNameById.get(id)).filter(Boolean) as string[];

            const selected = m.id === selectedMembroId;

            return (
              <button
                key={m.id}
                onClick={() => setSelectedMembroId(m.id)}
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
                    <div style={{ fontWeight: 800 }}>{m.nome}</div>
                    <div style={{ opacity: 0.8, marginTop: 4 }}>
                      {m.voluntario ? "Voluntário" : "—"} | {m.obreiro ? "Obreiro" : "—"}
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

      {/* Drawer */}
      {selectedMembro ? (
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
              color: "#fff",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>{selectedMembro.nome}</div>
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
