"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

type DepartamentoRow = { id: string; nome: string; ativo: boolean };
type FuncaoRow = {
  id: string;
  nome: string;
  departamento_id: string | null;
  ativo: boolean;
  created_at: string;
};

export default function FuncoesPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [departamentos, setDepartamentos] = useState<DepartamentoRow[]>([]);
  const [items, setItems] = useState<FuncaoRow[]>([]);

  const [nome, setNome] = useState("");
  const [depId, setDepId] = useState<string>("");
  const [ativo, setAtivo] = useState(true);

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

    const depRes = await supabase
      .from("departamentos")
      .select("id, nome, ativo")
      .order("nome", { ascending: true });

    if (depRes.error) {
      setErr(depRes.error.message);
      setBusy(false);
      return;
    }

    const fnRes = await supabase
      .from("funcoes")
      .select("id, nome, departamento_id, ativo, created_at")
      .order("created_at", { ascending: true });

    if (fnRes.error) {
      setErr(fnRes.error.message);
      setBusy(false);
      return;
    }

    const deps = (depRes.data as DepartamentoRow[]) ?? [];
    setDepartamentos(deps);
    setItems((fnRes.data as FuncaoRow[]) ?? []);
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

  async function create() {
    setSaving(true);
    setErr(null);
    setOk(null);

    const n = nome.trim();
    if (!n) {
      setSaving(false);
      setErr("Nome é obrigatório.");
      return;
    }

    const payload: { p_nome: string; p_departamento_id?: string | null; p_ativo: boolean } = {
      p_nome: n,
      p_ativo: ativo
    };

    if (depId) payload.p_departamento_id = depId;
    else payload.p_departamento_id = null;

    const { data, error } = await supabase.rpc("create_funcao", payload);

    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setNome("");
    setDepId("");
    setAtivo(true);
    setOk(`Criada (id: ${data}).`);
    await load();
  }

  async function toggleAtivo(f: FuncaoRow) {
    setErr(null);
    setOk(null);

    const { error } = await supabase.rpc("set_funcao_ativa", {
      p_funcao_id: f.id,
      p_ativo: !f.ativo
    });

    if (error) {
      setErr(error.message);
      return;
    }

    setOk(!f.ativo ? "Função ativada." : "Função inativada.");
    await load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const depName = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of departamentos) m.set(d.id, d.nome);
    return m;
  }, [departamentos]);

  const depsAtivos = departamentos.filter((d) => d.ativo);

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ marginTop: 0 }}>Funções</h1>

      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Funções são “postos” em escalas (ex: Som, Receção, Projeção). Podem ter um departamento “dono” (opcional),
        mas não limitam quem pode servir.
      </p>

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
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Nova função</h2>

        <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Som"
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
            <span>Departamento dono (opcional)</span>
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
              <option value="">—</option>
              {depsAtivos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            <span>Ativa</span>
          </label>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button
              onClick={create}
              disabled={saving}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #444",
                background: saving ? "#222" : "#111",
                color: "#fff",
                cursor: saving ? "not-allowed" : "pointer"
              }}
            >
              {saving ? "A criar…" : "Criar"}
            </button>

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

          {err ? <p style={{ color: "#ff6b6b", margin: 0 }}>{err}</p> : null}
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 18 }}>Lista</h2>

        {busy ? <p>A carregar…</p> : null}
        {!busy && items.length === 0 ? <p>Sem funções.</p> : null}

        {!busy && items.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((f) => (
              <div
                key={f.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid #333",
                  background: "#0b0b0b",
                  color: "#fff"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>
                      {f.nome} {!f.ativo ? <span style={{ opacity: 0.75 }}>(inativa)</span> : null}
                    </div>
                    <div style={{ opacity: 0.8, marginTop: 4 }}>
                      <strong>Dono:</strong> {f.departamento_id ? depName.get(f.departamento_id) ?? "—" : "—"}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleAtivo(f)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid #444",
                      background: f.ativo ? "#2a0f0f" : "#0f2a12",
                      color: "#fff",
                      cursor: "pointer",
                      minWidth: 140
                    }}
                  >
                    {f.ativo ? "Inativar" : "Ativar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
