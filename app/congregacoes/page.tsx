"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

type CongregacaoRow = {
  id: string;
  nome: string;
  morada: string | null;
  ativa: boolean;
  created_at: string;
};

export default function CongregacoesPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [items, setItems] = useState<CongregacaoRow[]>([]);

  const [nome, setNome] = useState("");
  const [morada, setMorada] = useState("");
  const [ativa, setAtiva] = useState(true);

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
      .from("congregacoes")
      .select("id, nome, morada, ativa, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    setItems((data as CongregacaoRow[]) ?? []);
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

    const { data, error } = await supabase.rpc("create_congregacao", {
      p_nome: n,
      p_morada: morada.trim() ? morada.trim() : null,
      p_ativa: ativa
    });

    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setNome("");
    setMorada("");
    setAtiva(true);
    setOk(`Criada (id: ${data}).`);

    await load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ marginTop: 0 }}>Congregações</h1>

      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Gestão básica de congregações (Fase 1). Associadas automaticamente à igreja (tenant).
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
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Nova congregação</h2>

        <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Sede"
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
            <span>Morada</span>
            <input
              value={morada}
              onChange={(e) => setMorada(e.target.value)}
              placeholder="Opcional"
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
            <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
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

        {!busy && items.length === 0 ? <p>Sem congregações.</p> : null}

        {!busy && items.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((c) => (
              <div
                key={c.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid #333",
                  background: "#0b0b0b",
                  color: "#fff"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.nome}</div>
                    <div style={{ opacity: 0.8, marginTop: 4 }}>{c.morada ?? "—"}</div>
                  </div>
                  <div style={{ opacity: 0.9 }}>{c.ativa ? "Ativa" : "Inativa"}</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
