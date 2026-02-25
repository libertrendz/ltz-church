/* PATH: app/definicoes/aparencia/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/client";

type Option = { key: string; nome: string; hex: string };

const OPTIONS: Option[] = [
  { key: "gold", nome: "Dourado", hex: "#D4AF37" },
  { key: "cyan", nome: "Cian", hex: "#00D4FF" },
  { key: "tangerina", nome: "Tangerina", hex: "#FF8C2B" },
  { key: "verde", nome: "Verde", hex: "#2EE59D" },
  { key: "branco", nome: "Branco", hex: "#FFFFFF" },
  { key: "rosegold", nome: "Rose Gold", hex: "#B76E79" }
];

export default function AparenciaPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [selected, setSelected] = useState<Option>(OPTIONS[0]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      if (!data.session) {
        router.replace("/login");
        return;
      }

      try {
        const v = localStorage.getItem("ltz_accent");
        const found = OPTIONS.find((o) => o.hex.toLowerCase() === (v || "").toLowerCase());
        if (found) setSelected(found);
      } catch {}

      setReady(true);
    })();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  async function guardar() {
    setErr(null);
    setOk(null);

    try {
      localStorage.setItem("ltz_accent", selected.hex);
      document.documentElement.style.setProperty("--accent", selected.hex);
    } catch {}

    // tentar persistir no tenant (se RLS permitir)
    try {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user?.id;
      if (!userId) throw new Error("Sem sessão.");

      const uRes = await supabase.from("usuarios").select("igreja_id").eq("id", userId).single();
      if (uRes.error) throw uRes.error;

      const igrejaId = uRes.data?.igreja_id as string | null;
      if (!igrejaId) throw new Error("Sem igreja_id no utilizador.");

      const up = await supabase.from("igrejas").update({ cor_primaria: selected.hex }).eq("id", igrejaId);
      if (up.error) {
        setOk("Guardado.");
        return;
      }

      setOk("Guardado.");
    } catch (e: any) {
      setOk("Guardado.");
      setErr(e?.message ? `Nota: ${e.message}` : null);
    }
  }

  if (!ready) return <main style={{ padding: 6 }}>A carregar…</main>;

  return (
    <main style={{ padding: 6 }}>
      <h1 style={{ marginTop: 4, marginBottom: 6 }}>Aparência</h1>
      <p style={{ opacity: 0.85, marginTop: 0 }}>Escolhe a cor de contraste.</p>

      {err ? <p style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{err}</p> : null}
      {ok ? <p style={{ color: "#7CFF7C" }}>{ok}</p> : null}

      <section className="card" style={{ marginTop: 12, borderRadius: 18, padding: 14 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Escolher cor</div>

        <div style={{ display: "grid", gap: 10 }}>
          {OPTIONS.map((o) => {
            const active = o.key === selected.key;
            return (
              <button
                key={o.key}
                onClick={() => setSelected(o)}
                style={{
                  textAlign: "left",
                  borderRadius: 16,
                  border: active ? `1px solid ${o.hex}` : "1px solid rgba(255,255,255,.12)",
                  background: "#070707",
                  color: "#fff",
                  padding: 12,
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 900 }}>{o.nome}</div>
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: o.hex,
                      border: "1px solid rgba(255,255,255,.18)",
                      display: "inline-block"
                    }}
                  />
                </div>
                <div style={{ opacity: 0.8, marginTop: 6 }}>{o.hex}</div>
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* ✅ agora é legível */}
          <button onClick={guardar} className="btn btnAccent" style={{ borderRadius: 12 }}>
            Guardar
          </button>

          <a href="/" style={{ color: "#fff", opacity: 0.9, textDecoration: "underline" }}>
            Voltar ao Início
          </a>
        </div>
      </section>
    </main>
  );
}