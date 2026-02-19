"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

type DepartamentoRow = {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
};

export default function DepartamentosPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [items, setItems] = useState<DepartamentoRow[]>([]);

  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);

  async function load() {
    setBusy(true);
    setErr(null);
    setOk(null);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      router.replace("/login");
      return;
    }

    const { data, error } = await supabase
      .from("departamentos")
      .select("id, nome, ativo, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    setItems((data as DepartamentoRow[]) ?? []);
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

    const { data, error } = await supabase.rpc("create_departamento", {
      p_nome: n,
      p_ativo: ativo
    });

    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setNome("");
    setAtivo(true);
    setOk(`Criado (id: ${data}).`);

    await load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ marginTop: 0 }}>Departamentos</h1>

      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Gestão básica de departamentos (Fase 1). Associados automaticamente à igreja (tenant).
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
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Novo departamento</h2>

        <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Louvor"
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
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
            <span>Ativo</span>
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

        {!busy && items.length === 0 ? <p>Sem departamentos.</p> : null}

        {!busy && items.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((d) => (
              <div
                key={d.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid #333",
                  background: "#0b0b0b",
                  color: "#fff"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontWeight: 700 }}>{d.nome}</div>
                  <div style={{ opacity: 0.9 }}>{d.ativo ? "Ativo" : "Inativo"}</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
