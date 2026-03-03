/* PATH: app/components/AppHeader.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

const APP_NAME = "LT-CHURCH"; // ✅ anti-regressão: marca oficial (sem Z)

type Role = "admin" | "membro";
type NavItem = { href: string; label: string };

const NAV_OPERACIONAL_ADMIN: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/cultos", label: "Cultos & Escalas" },
  { href: "/agenda", label: "Agenda" },
  { href: "/membros", label: "Membros" },
  { href: "/departamentos", label: "Departamentos" },
  { href: "/funcoes", label: "Funções" }
];

// Nota: rotas atuais (sem criar 404 agora)
const NAV_OPERACIONAL_MEMBRO: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/agenda", label: "Minha Agenda" },
  { href: "/cultos", label: "Minhas Escalas" }
];

const NAV_CONTA: NavItem[] = [
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 8, marginBottom: 6, fontSize: 12, letterSpacing: 1, opacity: 0.65, fontWeight: 950 }}>
      {children}
    </div>
  );
}

export default function AppHeader() {
  const pathname = usePathname();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [open, setOpen] = useState(false); // mobile full-screen menu
  const [accountOpen, setAccountOpen] = useState(false); // desktop dropdown

  const [tenantNome, setTenantNome] = useState<string>("—");
  const [role, setRole] = useState<Role>("membro"); // default seguro
  const [loaded, setLoaded] = useState(false);

  // não mostrar header no login
  if (pathname?.startsWith("/login")) return null;

  const NAV_OPERACIONAL = role === "admin" ? NAV_OPERACIONAL_ADMIN : NAV_OPERACIONAL_MEMBRO;

  const active = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  // fecha menus ao navegar
  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  // ESC fecha
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        setAccountOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // bloquear scroll quando menu mobile aberto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // carregar role + tenantNome (cache -> supabase)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // cache rápido
        try {
          const cachedNome = localStorage.getItem("ltz_tenant_nome");
          const cachedRole = localStorage.getItem("ltz_role");
          if (cachedNome && alive) setTenantNome(cachedNome);
          if ((cachedRole === "admin" || cachedRole === "membro") && alive) setRole(cachedRole as Role);
        } catch {}

        const { data: sess } = await supabase.auth.getSession();
        const userId = sess.session?.user?.id;

        if (!userId) {
          if (!alive) return;
          setRole("membro");
          setTenantNome("—");
          setLoaded(true);
          return;
        }

        const uRes = await supabase.from("usuarios").select("role, igreja_id").eq("id", userId).maybeSingle();
        if (!alive) return;

        const r = (uRes.data?.role as Role | null) ?? "membro";
        const igrejaId = (uRes.data?.igreja_id as string | null) ?? null;

        setRole(r);
        try {
          localStorage.setItem("ltz_role", r);
        } catch {}

        if (igrejaId) {
          const iRes = await supabase.from("igrejas").select("nome").eq("id", igrejaId).maybeSingle();
          const nome = (iRes.data?.nome as string | null) ?? null;

          if (!alive) return;

          if (nome) {
            setTenantNome(nome);
            try {
              localStorage.setItem("ltz_tenant_nome", nome);
            } catch {}
          } else {
            setTenantNome("—");
          }
        } else {
          setTenantNome("—");
        }

        setLoaded(true);
      } catch {
        if (!alive) return;
        setLoaded(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [supabase]);

  async function logout() {
    try {
      setOpen(false);
      setAccountOpen(false);

      try {
        localStorage.removeItem("ltz_role");
        localStorage.removeItem("ltz_tenant_nome");
      } catch {}

      await supabase.auth.signOut();
    } finally {
      // ✅ hard redirect para evitar client-side exception após signOut
      window.location.assign("/login");
    }
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
            alt={APP_NAME}
            width={64}
            height={64}
            style={{ borderRadius: 14, display: "block" }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 950, letterSpacing: 0.2, lineHeight: 1.1 }}>{APP_NAME}</div>
            <div style={{ color: "rgba(255,255,255,.80)", fontWeight: 850, fontSize: 13, lineHeight: 1.2 }}>
              {tenantNome}{" "}
              <span style={{ opacity: 0.55, fontWeight: 800 }}>
                {loaded ? (role === "admin" ? "• Admin" : "• Membro") : "• …"}
              </span>
            </div>
          </div>
        </a>

        <span style={{ flex: 1 }} />

        {/* Desktop: só operacional */}
        <div className="navDesktop" style={{ display: "none", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          {NAV_OPERACIONAL.map((item) => (
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

          {/* Conta dropdown */}
          <div style={{ position: "relative" }}>
            <button
              className="btn"
              onClick={() => setAccountOpen((v) => !v)}
              aria-label="Abrir conta"
              style={{ padding: "9px 12px", borderRadius: 14 }}
            >
              Conta ▾
            </button>

            {accountOpen ? (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 10px)",
                  width: 230,
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "rgba(10,10,10,.98)",
                  boxShadow: "0 18px 60px rgba(0,0,0,.6)",
                  padding: 10,
                  zIndex: 70
                }}
              >
                {NAV_CONTA.map((x) => (
                  <a
                    key={x.href}
                    href={x.href}
                    style={{
                      display: "block",
                      padding: "10px 12px",
                      borderRadius: 12,
                      textDecoration: "none",
                      color: "#fff",
                      fontWeight: 850,
                      background: active(x.href) ? "color-mix(in srgb, var(--accent) 12%, #0b0b0b 88%)" : "transparent",
                      border: active(x.href) ? "1px solid rgba(255,255,255,.12)" : "1px solid transparent"
                    }}
                  >
                    {x.label}
                  </a>
                ))}

                <div style={{ height: 10 }} />

                <button className="btn btnAccent" onClick={logout} style={{ width: "100%" }}>
                  Sair
                </button>
              </div>
            ) : null}
          </div>
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

      {/* CSS: desktop vs mobile */}
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

      {/* MOBILE MENU — FULL SCREEN (não se vê a home atrás) */}
      {open ? (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 90 }}>
          {/* backdrop forte */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,.86)"
            }}
          />

          {/* painel full-screen sólido */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "#050505",
              padding: 14,
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>Menu</div>
              <button onClick={() => setOpen(false)} className="btn" style={{ padding: "8px 10px", borderRadius: 12 }}>
                Fechar
              </button>
            </div>

            <div style={{ overflow: "auto", paddingBottom: 10 }}>
              <SectionTitle>OPERACIONAL</SectionTitle>
              <div style={{ display: "grid", gap: 10 }}>
                {NAV_OPERACIONAL.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    style={{
                      textDecoration: "none",
                      color: "#fff",
                      padding: "14px 14px",
                      borderRadius: 16,
                      border: active(item.href)
                        ? "1px solid color-mix(in srgb, var(--accent) 55%, rgba(255,255,255,.14) 45%)"
                        : "1px solid rgba(255,255,255,.10)",
                      background: active(item.href) ? "color-mix(in srgb, var(--accent) 12%, #0b0b0b 88%)" : "#0b0b0b",
                      fontWeight: active(item.href) ? 950 : 850
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              <div style={{ height: 14 }} />

              <SectionTitle>CONTA</SectionTitle>
              <div style={{ display: "grid", gap: 10 }}>
                {NAV_CONTA.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    style={{
                      textDecoration: "none",
                      color: "#fff",
                      padding: "14px 14px",
                      borderRadius: 16,
                      border: active(item.href)
                        ? "1px solid color-mix(in srgb, var(--accent) 55%, rgba(255,255,255,.14) 45%)"
                        : "1px solid rgba(255,255,255,.10)",
                      background: active(item.href) ? "color-mix(in srgb, var(--accent) 12%, #0b0b0b 88%)" : "#0b0b0b",
                      fontWeight: active(item.href) ? 950 : 850
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <button className="btn btnAccent" onClick={logout} style={{ width: "100%", padding: "12px 14px" }}>
                Sair
              </button>

              <div style={{ opacity: 0.75, fontSize: 12, lineHeight: 1.35 }}>
                {tenantNome} • {loaded ? (role === "admin" ? "Admin" : "Membro") : "…"}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}