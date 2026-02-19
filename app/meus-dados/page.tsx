"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

type MembroRow = {
  id: string;
  nome: string;
  data_nascimento: string | null;
  telefone: string | null;
  morada: string | null;
  voluntario: boolean;
  obreiro: boolean;
};

function toDateInputValue(isoDate: string | null): string {
  return isoDate ?? "";
}

export default function MeusDadosPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [membro, setMembro] = useState<MembroRow | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      setBusy(true);
      setErr(null);
      setOk(null);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (!active) return;

      if (sessionErr) {
        setErr(sessionErr.message);
        setBusy(false);
        return;
      }

      if (!sessionData.session) {
        router.replace("/login");
        return;
      }

      // 1) garante membro (cria se não existir)
      const { data: membroId, error: rpcErr } = await supabase.rpc(
        "ensure_member_for_current_user"
      );

      if (!active) return;

      if (rpcErr) {
        setErr(rpcErr.message);
        setBusy(false);
        return;
      }

      // 2) carrega dados do membro (RLS protege por igreja_id)
      const { data, error } = await supabase
        .from("membros")
        .select("id, nome, data_nascimento, telefone, morada, voluntario, obreiro")
        .eq("id", membroId)
        .single();

      if (!active) return;

      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }

      setMembro(data as MembroRow);
      setBusy(false);
    }

    run();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function save() {
    if (!membro) return;

    setSaving(true);
    setErr(null);
    setOk(null);

    const { error } = await supabase
      .from("membros")
      .update({
        nome: membro.nome,
        data_nascimento: membro.data_nascimento,
        telefone: membro.telefone,
        morada: membro.morada,
        voluntario: membro.voluntario,
        obreiro: membro.obreiro
      })
      .eq("id", membro.id);

    setSaving(false);

    if (error) {
      setErr(error.message);
      return;
    }

    setOk("Guardado.");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main style={{ padding: 24, maxWidth: 720 }}>
      <h1 style={{ marginTop: 0 }}>Meus Dados</h1>

      <p style={{ opacity: 0.8, marginTop: 6 }}>
        Nesta fase: dados básicos do membro. O “cadastro completo” vai crescer por etapas.
      </p>

      {busy ? <p>A carregar…</p> : null}

      {!busy && err ? (
        <p style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{err}</p>
      ) : null}

      {!busy && membro ? (
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
          <div style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Nome</span>
              <input
                value={membro.nome}
                onChange={(e) => setMembro({ ...membro, nome: e.target.value })}
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
              <span>Data de nascimento</span>
              <input
                type="date"
                value={toDateInputValue(membro.data_nascimento)}
                onChange={(e) =>
                  setMembro({
                    ...membro,
                    data_nascimento: e.target.value ? e.target.value : null
                  })
                }
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
              <span>Telefone</span>
              <input
                value={membro.telefone ?? ""}
                onChange={(e) =>
                  setMembro({ ...membro, telefone: e.target.value || null })
                }
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
                value={membro.morada ?? ""}
                onChange={(e) => setMembro({ ...membro, morada: e.target.value || null })}
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #333",
                  background: "#111",
                  color: "#fff"
                }}
              />
            </label>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={membro.voluntario}
                  onChange={(e) => setMembro({ ...membro, voluntario: e.target.checked })}
                />
                <span>Voluntário</span>
              </label>

              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={membro.obreiro}
                  onChange={(e) => setMembro({ ...membro, obreiro: e.target.checked })}
                />
                <span>Obreiro</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <button
                onClick={save}
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
                {saving ? "A guardar…" : "Guardar"}
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
          </div>
        </div>
      ) : null}
    </main>
  );
}
