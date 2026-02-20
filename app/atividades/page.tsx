"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

type AtividadeRow = {
  id: string;
  nome: string;
  created_at: string;
};

export default function AtividadesPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [items, setItems] = useState<AtividadeRow[]>([]);
  const [nome, setNome] = useState("");

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
      .from("atividades")
      .select("id, nome, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    setItems((data as AtividadeRow[]) ?? []);
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

    const { data, error } = await supabase.rpc("create_atividade", { p_nome: n });

    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setNome("");
    setOk(`Criada (id: ${data}).`);
    await load();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <h1 style={{ marginTop: 0 }}>Atividades</h1>

      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Gestão básica de atividades (Fase 1). Associadas automaticamente à igreja (tenant).
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
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Nova atividade</h2>

        <div style={{ display: "grid", gap: 12, maxWidth: 520 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Culto Domingo Manhã"
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid #333",
                background: "#111",
                color: "#fff"
              }}
            />
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

        {!busy && items.length === 0 ? <p>Sem atividades.</p> : null}

        {!busy && items.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((a) => (
              <div
                key={a.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid #333",
                  background: "#0b0b0b",
                  color: "#fff"
                }}
              >
                <div style={{ fontWeight: 700 }}>{a.nome}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
