"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

type DepartamentoRow = { id: string; nome: string; ativo: boolean };
type MembroRow = { id: string; nome: string; voluntario: boolean; obreiro: boolean };
type AssocRow = { membro_id: string; departamento_id: string };

export default function DepartamentosAssociarPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [departamentos, setDepartamentos] = useState<DepartamentoRow[]>([]);
  const [membros, setMembros] = useState<MembroRow[]>([]);
  const [assocs, setAssocs] = useState<AssocRow[]>([]);
  const [depId, setDepId] = useState<string>("");

  async function loadAll() {
    setBusy(true);
    setErr(null);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.replace("/login");
      return;
    }

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

    const assocRes = await supabase
      .from("membros_departamentos")
      .select("membro_id, departamento_id");

    if (assocRes.error) {
      setErr(assocRes.error.message);
      setBusy(false);
      return;
    }

    const deps = (depRes.data as DepartamentoRow[]) ?? [];
    setDepartamentos(deps);
    setMembros((memRes.data as MembroRow[]) ?? []);
    setAssocs((assocRes.data as AssocRow[]) ?? []);

    // Se ainda não há seleção, escolhe o primeiro departamento ativo.
    if (!depId) {
      const firstActive = deps.find((d) => d.ativo);
      if (firstActive) setDepId(firstActive.id);
    }

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

  // Sempre que muda o departamento selecionado, limpamos feedback para evitar confusão
  useEffect(() => {
    setOk(null);
    setErr(null);
  }, [depId]);

  function isInDep(membroId: string, departamentoId: string) {
    return assocs.some((a) => a.membro_id === membroId && a.departamento_id === departamentoId);
  }

  // Mapa: membro -> lista de departamentos onde está
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

  async function toggle(membroId: string, selectedDepId: string) {
    if (!selectedDepId) return;

    setErr(null);
    setOk(null);

    const already = isInDep(membroId, selectedDepId);

    if (already) {
      const { error } = await supabase.rpc("remove_membro_from_departamento", {
        p_membro_id: membroId,
        p_departamento_id: selectedDepId
      });
      if (error) {
        setErr(error.message);
        return;
      }
      setOk(`Removido do departamento: ${depNameById.get(selectedDepId) ?? "—"}`);
    } else {
      const { error } = await supabase.rpc("add_membro_to_departamento", {
        p_membro_id: membroId,
        p_departamento_id: selectedDepId
      });
      if (error) {
        setErr(error.message);
        return;
      }
      setOk(`Adicionado ao departamento: ${depNameById.get(selectedDepId) ?? "—"}`);
    }

    await loadAll();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const depsAtivos = departamentos.filter((d) => d.ativo);

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ marginTop: 0 }}>Associação Membros ↔ Departamentos</h1>

      <p style={{ opacity: 0.8, marginTop: 6 }}>
        O botão Adicionar/Remover refere-se sempre ao departamento actualmente seleccionado.
        Agora também mostramos “Em departamentos:” para acabar com ambiguidades.
      </p>

      {busy ? <p>A carregar…</p> : null}
      {err ? <p style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{err}</p> : null}

      {!busy ? (
        <div
          style={{
            marginTop: 12,
            padding: 16,
            borderRadius: 16,
            border: "1px solid #333",
            background: "#0b0b0b",
            color: "#fff"
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span>Departamento</span>
              <select
                value={depId}
                onChange={(e) => setDepId(e.target.value)}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #333",
                  background: "#111",
                  color: "#fff"
                }}
              >
                {depsAtivos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </select>
            </label>

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

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {membros.map((m) => {
              const inside = depId ? isInDep(m.id, depId) : false;
              const memberDeps = depsByMembro.get(m.id) ?? [];
              const memberDepNames = memberDeps
                .map((id) => depNameById.get(id))
                .filter(Boolean) as string[];

              return (
                <div
                  key={m.id}
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid #333",
                    background: "#111",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.nome}</div>
                    <div style={{ opacity: 0.8, marginTop: 4 }}>
                      {m.voluntario ? "Voluntário" : "—"} | {m.obreiro ? "Obreiro" : "—"}
                    </div>
                    <div style={{ opacity: 0.85, marginTop: 6 }}>
                      <strong>Em departamentos:</strong>{" "}
                      {memberDepNames.length > 0 ? memberDepNames.join(", ") : "—"}
                    </div>
                  </div>

                  <button
                    onClick={() => toggle(m.id, depId)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid #444",
                      background: inside ? "#2a0f0f" : "#0f2a12",
                      color: "#fff",
                      cursor: "pointer",
                      minWidth: 140
                    }}
                  >
                    {inside ? "Remover" : "Adicionar"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </main>
  );
}
