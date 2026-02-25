/* PATH: app/layout.tsx */
export const metadata = {
  title: "LTZ-CHURCH",
  description: "Multi-tenant SaaS para igrejas"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
          background: "#050505",
          color: "#fff"
        }}
      >
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
              padding: "14px 18px",
              display: "flex",
              gap: 14,
              alignItems: "center",
              flexWrap: "wrap"
            }}
          >
            <a href="/" style={{ color: "#fff", textDecoration: "none", fontWeight: 900 }}>
              LTZ-CHURCH
            </a>

            <a href="/cultos" style={{ color: "#fff", opacity: 0.9, textDecoration: "none" }}>
              Cultos & Escalas
            </a>
            <a href="/agenda" style={{ color: "#fff", opacity: 0.9, textDecoration: "none" }}>
              Agenda
            </a>
            <a href="/membros" style={{ color: "#fff", opacity: 0.9, textDecoration: "none" }}>
              Membros
            </a>
            <a href="/departamentos" style={{ color: "#fff", opacity: 0.9, textDecoration: "none" }}>
              Departamentos
            </a>
            <a href="/funcoes" style={{ color: "#fff", opacity: 0.9, textDecoration: "none" }}>
              Funções
            </a>

            <span style={{ flex: 1 }} />

            <a href="/me" style={{ color: "#fff", opacity: 0.9, textDecoration: "none" }}>
              Perfil
            </a>
          </nav>
        </header>

        <main style={{ maxWidth: 1100, margin: "0 auto", padding: 18 }}>{children}</main>
      </body>
    </html>
  );
}