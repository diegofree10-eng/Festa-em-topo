"use client";

import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  return (
    <div style={styles.container}>
      {/* NAVBAR */}
      <nav style={styles.nav}>
        <div style={styles.logo}>Catálogo Digital</div>
        <button style={styles.loginBtn} onClick={() => router.push("/admin")}>
          Acessar Painel
        </button>
      </nav>

      {/* HERO SECTION */}
      <header style={styles.hero}>
        <h1 style={styles.title}>
          Crie seu Catálogo Online e <br />
          <span style={styles.highlight}>Venda muito mais</span>
        </h1>
        <p style={styles.subtitle}>
          A plataforma perfeita para papelaria personalizada, confeitaria e pequenos negócios. 
          Tenha seu link exclusivo e receba pedidos direto no WhatsApp.
        </p>
        <div style={styles.actions}>
          <button style={styles.mainBtn} onClick={() => router.push("/admin/registro")}>
            Começar Agora Grátis
          </button>
          <button style={styles.secBtn} onClick={() => router.push("/festa-em-topo")}>
            Ver Exemplo Real
          </button>
        </div>
      </header>

      {/* FEATURES SECTION */}
      <section style={styles.features}>
        <div style={styles.featureCard}>
          <div style={styles.icon}>🚀</div>
          <h3>Rápido e Prático</h3>
          <p>Cadastre seus produtos em minutos e já saia vendendo com seu link próprio.</p>
        </div>
        <div style={styles.featureCard}>
          <div style={styles.icon}>📱</div>
          <h3>Foco no Mobile</h3>
          <p>Seu cliente acessa do celular com uma experiência de aplicativo, sem baixar nada.</p>
        </div>
        <div style={styles.featureCard}>
          <div style={styles.icon}>💬</div>
          <h3>Pedidos no Zap</h3>
          <p>Toda a venda finaliza no seu WhatsApp, facilitando a negociação e o pagamento.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <p>© 2026 Catálogo Digital - Desenvolvido para empreendedores.</p>
      </footer>
    </div>
  );
}

const styles = {
  container: { background: "#fff", color: "#1e293b", fontFamily: "'Segoe UI', Roboto, sans-serif" },
  nav: { 
    display: "flex", justifyContent: "space-between", alignItems: "center", 
    padding: "20px 5%", borderBottom: "1px solid #f1f5f9" 
  },
  logo: { fontSize: "20px", fontWeight: "bold", color: "#2563eb" },
  loginBtn: { 
    background: "transparent", border: "1px solid #2563eb", color: "#2563eb", 
    padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "600" 
  },
  hero: { 
    padding: "100px 5%", textAlign: "center", 
    background: "linear-gradient(to bottom, #f8faff, #fff)" 
  },
  title: { fontSize: "48px", fontWeight: "800", marginBottom: "20px", lineHeight: "1.1" },
  highlight: { color: "#2563eb" },
  subtitle: { fontSize: "18px", color: "#64748b", maxWidth: "700px", margin: "0 auto 40px" },
  actions: { display: "flex", gap: "15px", justifyContent: "center" },
  mainBtn: { 
    background: "#2563eb", color: "#fff", border: "none", 
    padding: "15px 30px", borderRadius: "10px", fontSize: "16px", 
    fontWeight: "bold", cursor: "pointer", boxShadow: "0 4px 14px rgba(37,99,235,0.3)" 
  },
  secBtn: { 
    background: "#f1f5f9", color: "#475569", border: "none", 
    padding: "15px 30px", borderRadius: "10px", fontSize: "16px", 
    fontWeight: "bold", cursor: "pointer" 
  },
  features: { 
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
    gap: "30px", padding: "80px 5%", maxWidth: "1200px", margin: "0 auto" 
  },
  featureCard: { 
    padding: "30px", borderRadius: "20px", background: "#f8fafc", textAlign: "center",
    transition: "transform 0.2s"
  },
  icon: { fontSize: "40px", marginBottom: "15px" },
  footer: { textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: "14px" }
};