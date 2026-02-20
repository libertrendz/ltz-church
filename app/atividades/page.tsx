"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

type AtividadeRow = {
  id: string;
  nome: string;
  descricao: string | null;
  recorrente: boolean;
  ativo: boolean;
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
  const [descricao, setDescricao] = useState("");
  const [recorrente, setRecorrente] = useState(true);

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
      .select("id, nome, descricao, recorrente, ativo, created_at")
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

    const { data, error } = await supabase.rpc("create_atividade", {
      p_nome: n,
      p_descricao: descricao.trim() ? descricao.trim() : null,
      p_recorrente: recorrente,
      p_ativo: true
    });

    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setNome("");
    setDescricao("");
    setRecorrente(true);
    setOk(`Criada (id: ${data}).`);
    await load();
  }

  async function toggleAtivo(a: AtividadeRow) {
    setErr(null);
    setOk(null);

    const { error } = await supabase.rpc("set_atividade_ativo", {
      p_atividade_id: a.id,
      p_ativo: !a.ativo
    });

    if (error) {
      setErr(error.message);
      return;
    }

    setOk(!a.ativo ? "Atividade ativada." : "Atividade inativada.");
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
        Atividade = tipo (ex: Culto, Ensaio, Reunião). As instâncias (dia/hora) vêm na Agenda/Escala.
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
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Nova atividade (tipo)</h2>

        <div style={{ display: "grid", gap: 12, maxWidth: 560 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Culto"
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
            <span>Descrição (opcional)</span>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Culto principal de domingo"
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
            <input
              type="checkbox"
              checked={recorrente}
              onChange={(e) => setRecorrente(e.target.checked)}
            />
            <span>Recorrente</span>
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
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800 }}>
                      {a.nome} {!a.ativo ? <span style={{ opacity: 0.75 }}>(inativa)</span> : null}
                    </div>
                    <div style={{ opacity: 0.8, marginTop: 4 }}>
                      {a.descricao ?? "—"} | {a.recorrente ? "Recorrente" : "Não recorrente"}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleAtivo(a)}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid #444",
                      background: a.ativo ? "#2a0f0f" : "#0f2a12",
                      color: "#fff",
                      cursor: "pointer",
                      minWidth: 140
                    }}
                  >
                    {a.ativo ? "Inativar" : "Ativar"}
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
