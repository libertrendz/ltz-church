/* PATH: app/layout.tsx */
import AppHeader from "./components/AppHeader";

export const metadata = {
  title: "LTZ-CHURCH",
  description: "Multi-tenant SaaS para igrejas",
  icons: {
    icon: [
      { url: "/images/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/images/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/images/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/images/favicon.ico" }
    ],
    apple: [{ url: "/images/icon-180x180.png", sizes: "180x180", type: "image/png" }]
  },
  manifest: "/manifest.webmanifest",
  themeColor: "#D4AF37"
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
        {/* aplica accent cedo (localStorage) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  try {
    var v = localStorage.getItem("ltz_accent");
    if (v) document.documentElement.style.setProperty("--accent", v);
  } catch(e) {}
})();`
          }}
        />

        <style
          dangerouslySetInnerHTML={{
            __html: `
:root{
  --accent: #D4AF37;
  --bg: #050505;
  --card: #0b0b0b;
  --card2:#070707;
  --border: rgba(255,255,255,.10);
  --border2: rgba(255,255,255,.14);
  --shadow: 0 14px 38px rgba(0,0,0,.45);
  --shadowHover: 0 18px 50px rgba(0,0,0,.55);
  --textDim: rgba(255,255,255,.82);
}
*{ box-sizing: border-box; }

a{ color: var(--accent); }
a.navlink{ color:#fff; opacity:.9; }
a.navlink:hover{ opacity:1; }

.h-accent{ display:inline-block; position:relative; }
.h-accent:after{
  content:"";
  display:block;
  height:3px;
  width:56px;
  margin-top:10px;
  border-radius:99px;
  background: var(--accent);
  opacity:.9;
}

.card{
  border: 1px solid var(--border);
  background: radial-gradient(1200px 400px at 20% 0%, rgba(255,255,255,.05), transparent 55%), var(--card);
  border-radius: 18px;
  box-shadow: var(--shadow);
  transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
}
.card:hover{
  transform: translateY(-2px);
  box-shadow: var(--shadowHover);
  border-color: var(--border2);
}
.cardGlow{
  box-shadow:
    0 14px 38px rgba(0,0,0,.45),
    0 0 0 1px rgba(255,255,255,.06),
    0 0 26px color-mix(in srgb, var(--accent) 18%, transparent 82%);
}

.btn{
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.18);
  background: #111;
  color: #fff;
  cursor: pointer;
  transition: transform .12s ease, border-color .12s ease, background .12s ease;
}
.btn:hover{ border-color: rgba(255,255,255,.28); transform: translateY(-1px); }

.btnAccent{
  border: 1px solid color-mix(in srgb, var(--accent) 60%, rgba(255,255,255,.12) 40%);
  background: color-mix(in srgb, var(--accent) 18%, #111 82%);
}
.btnAccent:hover{
  background: color-mix(in srgb, var(--accent) 26%, #111 74%);
}

.pill{
  display:inline-flex;
  align-items:center;
  padding:6px 10px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.14);
  background:#111;
  font-weight:800;
  font-size:13px;
  color:#fff;
}
.pillAccent{
  border: 1px solid color-mix(in srgb, var(--accent) 55%, rgba(255,255,255,.14) 45%);
  background: color-mix(in srgb, var(--accent) 14%, #0b0b0b 86%);
}
`
          }}
        />

        <AppHeader />

        <main style={{ maxWidth: 1100, margin: "0 auto", padding: 18 }}>{children}</main>
      </body>
    </html>
  );
}