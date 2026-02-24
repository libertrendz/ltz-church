/* PATH: app/escalas/[escalaId]/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/client";

type EscalaRow = {
  id: string;
  evento_id: string | null;
};

type EventoRow = {
  id: string;
  starts_at: string | null;
  titulo: string | null;
};

type FuncaoRow = {
  id: string;
  nome: string;
};

type SlotRow = {
  id: string;
  escala_id: string;
  funcao_id: string;
  slot_index: number;
  status: string;
};

type MembroRow = {
  id: string;
  nome: string | null;
  email: string | null;
};

type ItemRow = {
  id: string;
  escala_slot_id: string | null;
  membro_id: string;
  funcao_id: string;
  estado: string | null;
  notas: string | null;
  // Supabase pode devolver join como array
  membros?: { id: string; nome: string | null; email: string | null }[] | null;
};

function fmtLisbon(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pt-PT", {
    timeZone: "Europe/Lisbon",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

function safeMemberLabel(m: MembroRow) {
  return (m.nome && m.nome.trim()) || (m.email && m.email.trim()) || m.id;
}

export default function EscalaDetalhePage() {
  const router = useRouter();
  const params = useParams<{ escalaId: string }>();
  const escalaId = params.escalaId;

  const supabase = useMemo(() => supabaseBrowser(), []);

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [escala, setEscala] = useState<EscalaRow | null>(null);
  const [evento, setEvento] = useState<EventoRow | null>(null);

  const [funcoes, setFuncoes] = useState<Map<string, FuncaoRow>>(new Map());
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [itemsBySlot, setItemsBySlot] = useState<Map<string, ItemRow>>(new Map());

  const [membros, setMembros] = useState<MembroRow[]>([]);

  // UI state per slot
  const [selectedMembro, setSelectedMembro] = useState<Record<string, string>>({});
  const [selectedEstado, setSelectedEstado] = useState<Record<string, string>>({});
  const [notas, setNotas] = useState<Record<string, string>>({});
  const [savingSlot, setSavingSlot] = useState<Record<string, boolean>>({});

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

    // Escala
    const esRes = await supabase.from("escalas").select("id, evento_id").eq("id", escalaId).single();
    if (esRes.error) {
      setErr(esRes.error.message);
      setBusy(false);
      return;
    }
    setEscala(esRes.data as EscalaRow);

    // Evento (header)
    if (esRes.data?.evento_id) {
      const evRes = await supabase
        .from("agenda_eventos")
        .select("id, starts_at, titulo")
        .eq("id", esRes.data.evento_id)
        .single();

      if (evRes.error) {
        setErr(evRes.error.message);
        setBusy(false);
        return;
      }
      setEvento(evRes.data as EventoRow);
    } else {
      setEvento(null);
    }

    // Slots
    const slRes = await supabase
      .from("escala_slots")
      .select("id, escala_id, funcao_id, slot_index, status")
      .eq("escala_id", escalaId)
      .order("funcao_id", { ascending: true })
      .order("slot_index", { ascending: true });

    if (slRes.error) {
      setErr(slRes.error.message);
      setBusy(false);
      return;
    }
    const slotsData = (slRes.data as SlotRow[]) ?? [];
    setSlots(slotsData);

    // Funções (map)
    const funcaoIds = Array.from(new Set(slotsData.map((s) => s.funcao_id)));
    if (funcaoIds.length > 0) {
      const fRes = await supabase.from("funcoes").select("id, nome").in("id", funcaoIds);
      if (fRes.error) {
        setErr(fRes.error.message);
        setBusy(false);
        return;
      }
      const map = new Map<string, FuncaoRow>();
      (fRes.data as FuncaoRow[]).forEach((f) => map.set(f.id, f));
      setFuncoes(map);
    } else {
      setFuncoes(new Map());
    }

    // Itens (por slot) — usamos escala_slot_id
    const itRes = await supabase
      .from("escala_itens")
      .select("id, escala_slot_id, membro_id, funcao_id, estado, notas, membros:membro_id(id, nome, email)")
      .eq("escala_id", escalaId);

    if (itRes.error) {
      setErr(itRes.error.message);
      setBusy(false);
      return;
    }

    const items = ((itRes.data as unknown) as ItemRow[]) ?? [];
    const mapItems = new Map<string, ItemRow>();
    for (const it of items) {
      if (it.escala_slot_id) mapItems.set(it.escala_slot_id, it);
    }
    setItemsBySlot(mapItems);

    // Membros (para dropdown)
    const memRes = await supabase.from("membros").select("id, nome, email").order("nome", { ascending: true }).limit(500);
    if (memRes.error) {
      setErr(memRes.error.message);
      setBusy(false);
      return;
    }
    setMembros((memRes.data as MembroRow[]) ?? []);

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
  }, [escalaId]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const grouped = useMemo(() => {
    const m = new Map<string, SlotRow[]>();
    for (const s of slots) {
      if (!m.has(s.funcao_id)) m.set(s.funcao_id, []);
      m.get(s.funcao_id)!.push(s);
    }
    return Array.from(m.entries()).map(([funcaoId, arr]) => ({
      funcaoId,
      funcaoNome: funcoes.get(funcaoId)?.nome ?? funcaoId,
      slots: arr
    }));
  }, [slots, funcoes]);

  function getDefaultEstado(slotId: string) {
    return selectedEstado[slotId] ?? "confirmado";
  }

  async function assign(slot: SlotRow) {
    const membroId = selectedMembro[slot.id];
    if (!membroId) {
      setErr("Seleciona um membro.");
      return;
    }

    setSavingSlot((p) => ({ ...p, [slot.id]: true }));
    setErr(null);
    setOk(null);

    const estado = getDefaultEstado(slot.id);
    const nota = notas[slot.id]?.trim() ? notas[slot.id].trim() : null;

    const res = await supabase.rpc("assign_member_to_slot", {
      p_slot_id: slot.id,
      p_membro_id: membroId,
      p_estado: estado,
      p_notas: nota
    });

    setSavingSlot((p) => ({ ...p, [slot.id]: false }));

    if (res.error) {
      setErr(res.error.message);
      return;
    }

    setOk("Atribuído.");
    await load();
  }

  async function unassign(slot: SlotRow) {
    setSavingSlot((p) => ({ ...p, [slot.id]: true }));
    setErr(null);
    setOk(null);

    const res = await supabase.rpc("unassign_member_from_slot", {
      p_slot_id: slot.id
    });

    setSavingSlot((p) => ({ ...p, [slot.id]: false }));

    if (res.error) {
      setErr(res.error.message);
      return;
    }

    setOk("Removido.");
    await load();
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, color: "#fff" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <a href="/cultos" style={{ color: "#fff", opacity: 0.9, textDecoration: "underline" }}>
          Cultos & Escalas
        </a>
        <a href="/agenda" style={{ color: "#fff", opacity: 0.9, textDecoration: "underline" }}>
          Agenda
        </a>
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

      <h1 style={{ marginTop: 14 }}>Escala</h1>

      {busy ? <p>A carregar…</p> : null}
      {err ? <p style={{ color: "#ff6b6b", whiteSpace: "pre-wrap" }}>{err}</p> : null}

      {!busy ? (
        <div style={{ marginTop: 12, padding: 14, borderRadius: 16, border: "1px solid #333", background: "#0b0b0b" }}>
          <div style={{ fontWeight: 900 }}>
            {evento?.starts_at ? `${fmtLisbon(evento.starts_at)} · ${evento.titulo ?? "Evento"}` : "Evento —"}
          </div>
          <div style={{ opacity: 0.8, marginTop: 4 }}>Escala ID: {escala?.id}</div>
        </div>
      ) : null}

      {!busy ? (
        <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
          {grouped.map((g) => {
            const total = g.slots.length;
            const filled = g.slots.filter((s) => (s.status ?? "").toLowerCase() === "fechado").length;

            return (
              <section key={g.funcaoId} style={{ border: "1px solid #333", borderRadius: 16, background: "#0b0b0b" }}>
                <div style={{ padding: 12, borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 900, fontSize: 16 }}>{g.funcaoNome}</div>
                  <div style={{ opacity: 0.85 }}>
                    {filled}/{total}
                  </div>
                </div>

                <div style={{ padding: 12, display: "grid", gap: 10 }}>
                  {g.slots.map((s) => {
                    const item = itemsBySlot.get(s.id) ?? null;
                    const isFilled = (s.status ?? "").toLowerCase() === "fechado";
                    const disabled = !!savingSlot[s.id];

                    const joined = item?.membros && item.membros.length > 0 ? item.membros[0] : null;
                    const label = joined ? safeMemberLabel({ id: joined.id, nome: joined.nome, email: joined.email }) : null;

                    return (
                      <div
                        key={s.id}
                        style={{
                          border: "1px solid #333",
                          borderRadius: 14,
                          padding: 12,
                          display: "grid",
                          gap: 10,
                          background: "#0b0b0b"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                          <div style={{ fontWeight: 800 }}>
                            Slot {s.slot_index}{" "}
                            <span style={{ opacity: 0.8, fontWeight: 600 }}>
                              · {isFilled ? "preenchido" : "vazio"}
                            </span>
                          </div>

                          {isFilled ? (
                            <button
                              onClick={() => unassign(s)}
                              disabled={disabled}
                              style={{
                                padding: "10px 14px",
                                borderRadius: 12,
                                border: "1px solid #444",
                                background: disabled ? "#222" : "#2a0f0f",
                                color: "#fff",
                                cursor: disabled ? "not-allowed" : "pointer",
                                minWidth: 120
                              }}
                            >
                              Remover
                            </button>
                          ) : (
                            <button
                              onClick={() => assign(s)}
                              disabled={disabled}
                              style={{
                                padding: "10px 14px",
                                borderRadius: 12,
                                border: "1px solid #444",
                                background: disabled ? "#222" : "#0f2a12",
                                color: "#fff",
                                cursor: disabled ? "not-allowed" : "pointer",
                                minWidth: 120
                              }}
                            >
                              Atribuir
                            </button>
                          )}
                        </div>

                        {isFilled ? (
                          <div style={{ opacity: 0.9 }}>
                            <b>{label ?? "—"}</b>
                            {item?.estado ? <span style={{ opacity: 0.85 }}> · {item.estado}</span> : null}
                            {item?.notas ? <div style={{ opacity: 0.85, marginTop: 6 }}>Notas: {item.notas}</div> : null}
                          </div>
                        ) : (
                          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Membro</span>
                              <select
                                value={selectedMembro[s.id] ?? ""}
                                onChange={(e) => setSelectedMembro((p) => ({ ...p, [s.id]: e.target.value }))}
                                style={{
                                  padding: 10,
                                  borderRadius: 10,
                                  border: "1px solid #333",
                                  background: "#111",
                                  color: "#fff"
                                }}
                              >
                                <option value="">—</option>
                                {membros.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {safeMemberLabel(m)}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label style={{ display: "grid", gap: 6 }}>
                              <span>Estado</span>
                              <select
                                value={getDefaultEstado(s.id)}
                                onChange={(e) => setSelectedEstado((p) => ({ ...p, [s.id]: e.target.value }))}
                                style={{
                                  padding: 10,
                                  borderRadius: 10,
                                  border: "1px solid #333",
                                  background: "#111",
                                  color: "#fff"
                                }}
                              >
                                <option value="confirmado">confirmado</option>
                                <option value="pendente">pendente</option>
                              </select>
                            </label>

                            <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
                              <span>Notas (opcional)</span>
                              <input
                                value={notas[s.id] ?? ""}
                                onChange={(e) => setNotas((p) => ({ ...p, [s.id]: e.target.value }))}
                                style={{
                                  padding: 10,
                                  borderRadius: 10,
                                  border: "1px solid #333",
                                  background: "#111",
                                  color: "#fff"
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </main>
  );
}
