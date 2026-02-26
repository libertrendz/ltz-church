/* PATH: app/components/AppHeader.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

type NavItem = { href: string; label: string };

const NAV: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/cultos", label: "Cultos & Escalas" },
  { href: "/agenda", label: "Agenda" },
  { href: "/membros", label: "Membros" },
  { href: "/departamentos", label: "Departamentos" },
  { href: "/funcoes", label: "Funções" },
  { href: "/definicoes/aparencia", label: "Aparência" },
  { href: "/me", label: "Perfil" }
];

function Hamburger({ open }: { open: boolean }) {
  const line: React.CSSProperties = {
    height: 2,
    width: 18,
    background: "rgba(255,255,255,.92)",
    borderRadius: 99,
    transition: "transform .15s ease, opacity .15s ease"
  };

  return (
    <div style={{ width: 22, height: 18, display: "grid", alignContent: "center", gap: 4 }}>
      <span style={{ ...line, transform: open ? "translateY(6px) rotate(45deg)" : "none" }} />
      <span style={{ ...line, opacity: open ? 0 : 1 }} />
      <span style={{ ...line, transform: open ? "translateY(-6px) rotate(-45deg)" : "none" }} />
    </div>
  );
}

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [open, setOpen] = useState(false);
  const [tenantNome, setTenantNome] = useState<string>("—");

  // ✅ não mostrar header no login
  if (pathname?.startsWith("/login")) return null;

  // fecha ao navegar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ESC fecha
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // bloquear scroll quando drawer aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ✅ carregar nome da igreja (tenant) com cache local
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        // cache imediato (evita “piscas”)
        const cached = localStorage.getItem("ltz_tenant_nome");
        if (cached && active) setTenantNome(cached);

        const { data: sess } = await supabase.auth.getSession();
        const userId = sess.session?.user?.id;

        if (!userId) {
          if (active) setTenantNome("—");
          return;
        }

        const uRes = await supabase.from("usuarios").select("igreja_id").eq("id", userId).single();
        if (uRes.error) return;

        const igrejaId = (uRes.data?.igreja_id as string | null) || null;
        if (!igrejaId) return;

        const iRes = await supabase.from("igrejas").select("nome").eq("id", igrejaId).single();
        if (iRes.error) return;

        const nome = (iRes.data?.nome as string | null) || null;
        if (!active) return;

        const finalNome = nome || "—";
        setTenantNome(finalNome);
        if (nome) localStorage.setItem("ltz_tenant_nome", nome);
      } catch {
        // silencioso
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  const active = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  async function logout() {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignora
    }
    // ✅ hard redirect evita “client-side exception” pós-logout
    window.location.href = "/login";
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(5,5,5,0.92)",
        borderBottom: "1px solid #222",
        backdropFilter: "blur(10px)"
      }}
    >
      <nav
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12
        }}
      >
        {/* Brand */}
        <a
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            textDecoration: "none",
            minWidth: 0
          }}
        >
          <img
            src="/images/logo_oficial_church.png"
            alt="LTZ-CHURCH"
            width={64}
            height={64}
            style={{ borderRadius: 14, display: "block" }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 950, letterSpacing: 0.2, lineHeight: 1.1 }}>
              LTZ-CHURCH
            </div>
            <div style={{ color: "rgba(255,255,255,.75)", fontWeight: 900, fontSize: 13, lineHeight: 1.2 }}>
              {tenantNome}
            </div>
          </div>
        </a>

        <span style={{ flex: 1 }} />

        {/* Desktop nav */}
        <div
          className="navDesktop"
          style={{
            display: "none",
            gap: 14,
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="navlink"
              style={{
                textDecoration: "none",
                opacity: active(item.href) ? 1 : 0.9,
                fontWeight: active(item.href) ? 900 : 800,
                borderBottom: active(item.href) ? "2px solid var(--accent)" : "2px solid transparent",
                paddingBottom: 6
              }}
            >
              {item.label}
            </a>
          ))}

          <button onClick={logout} className="btn" style={{ padding: "8px 10px", borderRadius: 12 }}>
            Sair
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="navMobileBtn"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,.18)",
            background: "#111",
            color: "#fff",
            padding: "10px 12px",
            cursor: "pointer"
          }}
        >
          <Hamburger open={open} />
        </button>
      </nav>

      {/* CSS simples para desktop vs mobile */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media (min-width: 860px){
  .navDesktop{ display:flex !important; }
  .navMobileBtn{ display:none !important; }
}
`
        }}
      />

      {/* Drawer (mobile) — ✅ “bulletproof”: flex + flex:1 + overflow */}
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60
          }}
        >