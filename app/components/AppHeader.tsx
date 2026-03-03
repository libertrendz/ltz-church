/* PATH: app/components/AppHeader.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "../../lib/supabase/client";

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

const NAV_OPERACIONAL_MEMBRO: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/cultos", label: "Minhas Escalas" },
  { href: "/agenda", label: "Minha Agenda" }
];

const NAV_DEFINICOES: NavItem[] = [
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
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [open, setOpen] = useState(false);

  const [tenantNome, setTenantNome] = useState<string>("—");
  const [role, setRole] = useState<Role>("membro"); // default seguro
  const [loaded, setLoaded] = useState(false);

  // não mostrar header no login
  if (pathname?.startsWith("/login")) return null;

  // fecha drawer ao navegar
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

  // carregar role + tenantNome (cache -> supabase)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // cache rápido (não pode quebrar UX)
        const cachedNome = localStorage.getItem("ltz_tenant_nome");
        const cachedRole = localStorage.getItem("ltz_role");
        if (cachedNome && alive) setTenantNome(cachedNome);
        if ((cachedRole === "admin" || cachedRole === "membro") && alive) setRole(cachedRole);

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
        localStorage.setItem("ltz_role", r);

        if (igrejaId) {
          const iRes = await supabase.from("igrejas").select("nome").eq("id", igrejaId).maybeSingle();
          const nome = (iRes.data?.nome as string | null) ?? null;

          if (!alive) return;
          if (nome) {
            setTenantNome(nome);
            localStorage.setItem("ltz_tenant_nome", nome);
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

  const NAV_OP = role === "admin" ? NAV_OPERACIONAL_ADMIN : NAV_OPERACIONAL_MEMBRO;

  const active = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  async function doLogout() {
    try {
      // fecha drawer já, evita estados estranhos
      setOpen(false);

      // limpa caches locais
      try {
        localStorage.removeItem("ltz_role");
        localStorage.removeItem("ltz_tenant_nome");
        // mantém ltz_accent (é visual do tenant; se quiseres limpar, diz)
      } catch {}

      await supabase.auth.signOut();

      // ✅ hard redirect (resolve o “client-side exception” pós-logout)
      window.location.assign("/login");
    } catch {
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
            alt="LTZ-CHURCH"
            width={64}
            height={64}
            style={{ borderRadius: 14, display: "block" }}
          />

          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 950, letterSpacing: 0.2, lineHeight: 1.1 }}>
              LTZ-CHURCH
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
                color: "rgba(255,255,255,.82)",
                fontWeight: 900,
                fontSize: 14,
                lineHeight: 1.2
              }}
            >
              <span>{tenantNome}</span>

              <span
                className="pill pillAccent"
                style={{
                  fontSize: 12,
                  padding: "5px 10px",
                  fontWeight: 950,
                  opacity: loaded ? 1 : 0.7
                }}
              >
                {loaded ? (role === "admin" ? "Admin" : "Membro") : "…"}
              </span>
            </div>
          </div>
        </a>

        <span style={{ flex: 1 }} />

        {/* Desktop nav — só Operacional */}
        <div
          className="navDesktop"
          style={{
            display: "none",
            gap: 14,
            alignItems: "center",
            flexWrap: "wrap"
          }}
        >
          {NAV_OP.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="navlink"
              style={{
                textDecoration: "none",
                opacity: active(item.href) ? 1 : 0.9,
                fontWeight: active(item.href) ? 950 : 850,
                borderBottom: active(item.href) ? "2px solid var(--accent)" : "2px solid transparent",
                paddingBottom: 6
              }}
            >
              {item.label}
            </a>
          ))}

          {/* botão Definições (leva para Aparência por enquanto) */}
          <a
            href="/definicoes/aparencia"
            className="navlink"
            style={{ textDecoration: "none", opacity: 0.9, fontWeight: 850 }}
          >
            Definições
          </a>

          <button onClick={doLogout} className="btn" style={{ padding: "8px 12px", borderRadius: 12 }}>
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

      {/* CSS desktop vs mobile */}
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

      {/* Drawer (mobile) — opaco + backdrop forte (sem mistura com o fundo) */}
      {open ? (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 60 }}>
          {/* backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,.72)" // ✅ mais forte
            }}
          />

          {/* panel */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              height: "100%",
              width: "90%",
              maxWidth: 380,
              background: "#0a0a0a", // ✅ sólido, sem transparência
              borderLeft: "1px solid rgba(255,255,255,.10)",
              boxShadow: "0 18px 60px rgba(0,0,0,.70)",
              padding: 14,
              display: "grid",
              gridTemplateRows: "auto 1fr auto",
              gap: 12
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Menu</div>
              <button onClick={() => setOpen(false)} className="btn" style={{ padding: "8px 10px", borderRadius: 12 }}>
                Fechar
              </button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ opacity: 0.8, fontWeight: 950, fontSize: 12, letterSpacing: 0.4 }}>OPERACIONAL</div>
              <div style={{ display: "grid", gap: 10 }}>
                {NAV_OP.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    style={{
                      textDecoration: "none",
                      color: "#fff",
                      padding: "12px 12px",
                      borderRadius: 14,
                      border: active(item.href)
                        ? "1px solid color-mix(in srgb, var(--accent) 55%, rgba(255,255,255,.14) 45%)"
                        : "1px solid rgba(255,255,255,.10)",
                      background: active(item.href)
                        ? "color-mix(in srgb, var(--accent) 12%, #0b0b0b 88%)"
                        : "#0b0b0b",
                      fontWeight: active(item.href) ? 950 : 850
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>

              <div style={{ opacity: 0.8, fontWeight: 950, fontSize: 12, letterSpacing: 0.4 }}>DEFINIÇÕES</div>
              <div style={{ display: "grid", gap: 10 }}>
                {NAV_DEFINICOES.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    style={{
                      textDecoration: "none",
                      color: "#fff",
                      padding: "12px 12px",
                      borderRadius: 14,
                      border: active(item.href)
                        ? "1px solid color-mix(in srgb, var(--accent) 55%, rgba(255,255,255,.14) 45%)"
                        : "1px solid rgba(255,255,255,.10)",
                      background: active(item.href)
                        ? "color-mix(in srgb, var(--accent) 12%, #0b0b0b 88%)"
                        : "#0b0b0b",
                      fontWeight: active(item.href) ? 950 : 850
                    }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <button onClick={doLogout} className="btn btnAccent" style={{ width: "100%", justifySelf: "stretch" }}>
                Sair
              </button>

              <div style={{ opacity: 0.7, fontSize: 12, lineHeight: 1.35 }}>
                {role === "admin" ? "Modo Admin" : "Modo Membro"}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
