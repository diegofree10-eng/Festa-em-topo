"use client";

import { useState, FormEvent } from "react";
import { auth, db } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from "firebase/auth";
import { doc, setDoc, getDoc, collection, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

// --- CONFIGURAÇÃO DE SEGURANÇA ---
const PALAVRAS_PROIBIDAS = [
  "admin", "master", "suporte", "festaemtopo", "root", "null", 
  "undefined", "api", "vendas", "financeiro", "ajuda", "config",
  "sistema", "login", "auth", "teste", "gerente"
];

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nomeLoja, setNomeLoja] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const setAuthCookie = () => {
    document.cookie = `session=true; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`;
  };

  const garantirVinculoSeguranca = async (user: any, lojaIdForcado: string | null = null) => {
    const userRef = doc(db, "usuarios", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        lojaId: lojaIdForcado || user.uid,
        email: user.email,
        role: email === "diegofree10@gmail.com" ? "master" : "admin",
        atualizadoEm: Date.now()
      });
    }
  };

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // --- LÓGICA DE LOGIN ---
        const userCredential = await signInWithEmailAndPassword(auth, email, senha);
        const user = userCredential.user;

        const idLojaImagem = "dyMHL51GQMnXRFonLx3Mm1zuYB2";
        await garantirVinculoSeguranca(user, email === "diegofree10@gmail.com" ? idLojaImagem : null);

        setAuthCookie(); 
        router.push("/admin");
      } else {
        // --- LÓGICA DE CADASTRO ---
        const nomeParaCheck = nomeLoja.trim().toLowerCase();
        if (PALAVRAS_PROIBIDAS.some(p => nomeParaCheck.includes(p))) {
          alert("Nome da loja contém termos reservados.");
          setLoading(false);
          return;
        }

        // 1. Gerar o Slug automaticamente (link da loja)
        const slugGerado = nomeLoja
          .toLowerCase()
          .trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") // Remove acentos
          .replace(/[^a-z0-9]/g, "-")      // Troca espaços e símbolos por hifen
          .replace(/-+/g, "-")             // Evita hifens duplos
          .replace(/^-+|-+$/g, "");        // Remove hifen no início ou fim

        // 2. Criar usuário no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const user = userCredential.user;

        // 3. Buscar Configurações de Plano Master para o Período de Teste
        const planosRef = doc(db, "configuracoes", "planos");
        const planosSnap = await getDoc(planosRef);
        const dadosPlanos = planosSnap.exists() ? planosSnap.data() : {};

        const diasTeste = dadosPlanos["Bronze"]?.diasTeste || 7;
        
        // 4. Calcular Data de Vencimento
        const dataVenc = new Date();
        dataVenc.setDate(dataVenc.getDate() + diasTeste);
        const dataVencFormatada = dataVenc.toISOString().split('T')[0];

        // 5. Criar Vínculo de Segurança (usuarios)
        await setDoc(doc(db, "usuarios", user.uid), {
          lojaId: user.uid,
          email: email,
          role: "admin"
        });

        // 6. Criar Documento da Loja (lojistas) com o SLUG
        await setDoc(doc(db, "lojistas", user.uid), {
          nomeLoja: nomeLoja.trim(),
          slug: slugGerado, // <--- CAMPO ADICIONADO PARA O LINK FUNCIONAR
          email: email,
          dataCadastro: Date.now(),
          dataVencimento: dataVencFormatada,
          plano: "Bronze",
          ciclo: "mensal",
          status: "ativo",
          isTeste: true,
          role: "lojista",
          ultimoLogin: new Date().toISOString(),
          produtos: [],
          vendas: []
        });

        // 7. Criar Coleção Inicial de Categorias
        const catRef = collection(db, "lojistas", user.uid, "categorias");
        await addDoc(catRef, { nome: "Geral" });

        setAuthCookie();
        alert(`🎉 Loja "${nomeLoja}" criada! Link: festaemtopo.com/${slugGerado}`);
        router.push("/admin");
      }
    } catch (error: any) {
      console.error("Erro completo:", error);
      if (error.code === 'auth/email-already-in-use') {
        alert("Este e-mail já está em uso. Tente fazer login.");
      } else if (error.code === 'auth/weak-password') {
        alert("A senha deve ter pelo menos 6 caracteres.");
      } else {
        alert("Erro na autenticação: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperarSenha = async () => {
    if (!email) return alert("Digite seu e-mail.");
    try {
      await sendPasswordResetEmail(auth, email);
      alert("E-mail de recuperação enviado!");
    } catch (error: any) {
      alert("Erro: " + error.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.banner}>
        <div style={styles.logoCircle}>F</div>
        <h1 style={styles.bannerTitle}>Festa em Topo</h1>
        <p style={styles.bannerSubtitle}>
          Crie sua loja de personalizados e gerencie tudo em um só lugar.
        </p>
        <div style={styles.bannerDecoration}></div>
      </div>

      <div style={styles.loginArea}>
        <form onSubmit={handleAuth} style={styles.card}>
          <div style={styles.header}>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#1a1a1a' }}>
              {isLogin ? "Bem-vindo de volta!" : "Começar teste grátis"}
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '5px' }}>
              {isLogin ? "Acesse seu painel administrativo" : "Crie sua conta em segundos"}
            </p>
          </div>

          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nome da Loja</label>
              <input 
                placeholder="Ex: Nome da sua Loja" 
                value={nomeLoja} 
                onChange={(e) => setNomeLoja(e.target.value)} 
                style={styles.input} 
                required 
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>E-mail</label>
            <input 
              type="email" 
              placeholder="seu@email.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              style={styles.input} 
              required 
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Senha</label>
            <input 
              type="password" 
              placeholder="Sua senha secreta" 
              value={senha} 
              onChange={(e) => setSenha(e.target.value)} 
              style={styles.input} 
              required 
            />
          </div>

          {isLogin && (
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <button type="button" onClick={handleRecuperarSenha} style={styles.btnLink}>
                Esqueceu sua senha?
              </button>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              ...styles.btn, 
              background: loading ? '#cbd5e1' : '#055bb1',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? "Processando..." : (isLogin ? "Entrar" : "Criar minha Loja")}
          </button>

          <div style={{ textAlign: 'center', marginTop: '25px' }}>
            <button 
              type="button" 
              onClick={() => {
                setIsLogin(!isLogin);
                setNomeLoja("");
              }} 
              style={{ ...styles.btnLink, textDecoration: 'none', fontWeight: 'bold' }}
            >
              {isLogin ? "Não tem conta? Cadastre-se grátis" : "Já tenho conta? Entrar agora"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: any = {
  container: { display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#f0f2f5' },
  banner: { flex: '0 0 40%', background: '#055bb1', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', textAlign: 'center', position: 'relative', overflow: 'hidden' },
  logoCircle: { width: '60px', height: '60px', background: '#fdb813', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#055bb1', fontWeight: 'bold', fontSize: '28px', marginBottom: '20px', zIndex: 2 },
  bannerTitle: { margin: 0, fontSize: '28px', fontWeight: 'bold', zIndex: 2 },
  bannerSubtitle: { fontSize: '16px', color: '#e2e8f0', marginTop: '10px', maxWidth: '300px', zIndex: 2 },
  bannerDecoration: { position: 'absolute', bottom: '-100px', left: '-100px', width: '400px', height: '400px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', zIndex: 1 },
  loginArea: { flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
  card: { background: '#fff', padding: '45px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '420px' },
  header: { textAlign: 'center', marginBottom: '35px' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#333' },
  input: { width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e1e1e1', boxSizing: 'border-box', fontSize: '16px', outlineColor: '#055bb1', color: '#000' },
  btn: { width: '100%', padding: '16px', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', transition: '0.2s', marginTop: '10px' },
  btnLink: { background: 'none', border: 'none', color: '#055bb1', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }
};