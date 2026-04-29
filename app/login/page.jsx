"use client";

import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from "firebase/auth";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";
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

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        // LÓGICA DE LOGIN
        await signInWithEmailAndPassword(auth, email, senha);
        setAuthCookie(); 
        router.push("/admin");
      } else {
        // --- LÓGICA DE CADASTRO COM PROTEÇÃO ---
        
        // 1. Validação de Palavras Proibidas
        const nomeParaCheck = nomeLoja.trim().toLowerCase();
        const temPalavraProibida = PALAVRAS_PROIBIDAS.some(palavra => 
          nomeParaCheck.includes(palavra)
        );

        if (temPalavraProibida) {
          alert("Por motivos de segurança, o nome da loja não pode conter termos reservados (como 'admin', 'suporte' ou 'festaemtopo').");
          setLoading(false);
          return;
        }

        // 2. Validação de Caracteres Especiais (Apenas letras, números e espaços)
        const regexNomeValido = /^[a-zA-Z0-9À-ÿ ]+$/;
        if (!regexNomeValido.test(nomeLoja)) {
          alert("O nome da loja deve conter apenas letras e números, sem símbolos especiais.");
          setLoading(false);
          return;
        }

        // 3. Validação de Senha
        if (senha.length < 6) {
          alert("A senha precisa ter no mínimo 6 caracteres.");
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
        const user = userCredential.user;

        // Cria o documento do lojista no Firestore
        await setDoc(doc(db, "lojistas", user.uid), {
          nomeLoja: nomeLoja.trim(),
          email: email,
          dataCadastro: Date.now(),
          plano: "Bronze",
          ativo: true,
          role: "lojista"
        });

        const catRef = collection(db, "lojistas", user.uid, "categorias");
        await addDoc(catRef, { nome: "Geral" });

        alert(`🎉 Loja "${nomeLoja}" criada com sucesso! Faça login para acessar.`);
        setIsLogin(true);
        setEmail(""); 
        setSenha(""); 
        setNomeLoja("");
      }
    } catch (error) {
      console.error("Erro completo:", error);
      
      if (error.code === 'auth/invalid-credential') {
        alert("E-mail ou senha incorretos. Verifique os dados e tente novamente.");
      } else if (error.code === 'auth/user-disabled') {
        alert("Esta conta foi desativada pelo administrador.");
      } else if (error.code === 'auth/email-already-in-use') {
        alert("Este e-mail já está cadastrado em outra loja.");
      } else if (error.code === 'auth/weak-password') {
        alert("Senha muito fraca. Tente uma combinação mais complexa.");
      } else if (error.code === 'auth/too-many-requests') {
        alert("Muitas tentativas malsucedidas. Tente novamente em alguns minutos.");
      } else {
        alert("Ops! Ocorreu um erro: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperarSenha = async () => {
    if (!email) {
      alert("Digite seu e-mail no campo acima para recuperar a senha.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
    } catch (error) {
      alert("Erro ao enviar e-mail: " + error.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.banner}>
        <div style={styles.logoCircle}>G</div>
        <h1 style={styles.bannerTitle}>Gestão Administrativa</h1>
        <p style={styles.bannerSubtitle}>
          Controle sua loja, produtos e pedidos em um só lugar.
        </p>
        <div style={styles.bannerDecoration}></div>
      </div>

      <div style={styles.loginArea}>
        <form onSubmit={handleAuth} style={styles.card}>
          <div style={styles.header}>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#1a1a1a' }}>
              {isLogin ? "Bem-vindo de volta!" : "Crie sua conta"}
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginTop: '5px' }}>
              {isLogin ? "Acesse seu painel administrativo" : "Preencha os dados para começar"}
            </p>
          </div>

          {!isLogin && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nome da Loja</label>
              <input 
                placeholder="Ex: Minha Loja" 
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
              placeholder="Mínimo 6 caracteres" 
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
              background: loading ? '#cbd5e1' : '#2ecc71',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? "Processando..." : (isLogin ? "Entrar no Painel" : "Criar minha Loja")}
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
              {isLogin ? "Ainda não tem conta? Cadastre-se aqui" : "Já tenho conta? Fazer Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#f0f2f5' },
  banner: { flex: '0 0 40%', background: '#055bb1', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '40px', textAlign: 'center', position: 'relative', overflow: 'hidden' },
  logoCircle: { width: '60px', height: '60px', background: '#2ecc71', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '28px', marginBottom: '20px', zIndex: 2 },
  bannerTitle: { margin: 0, fontSize: '28px', fontWeight: 'bold', zIndex: 2 },
  bannerSubtitle: { fontSize: '16px', color: '#e2e8f0', marginTop: '10px', maxWidth: '300px', zIndex: 2 },
  bannerDecoration: { position: 'absolute', bottom: '-100px', left: '-100px', width: '400px', height: '400px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', zIndex: 1 },
  loginArea: { flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
  card: { background: '#fff', padding: '45px', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '420px' },
  header: { textAlign: 'center', marginBottom: '35px' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: '#333' },
  input: { width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #e1e1e1', boxSizing: 'border-box', fontSize: '16px', outlineColor: '#2ecc71' },
  btn: { width: '100%', padding: '16px', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', fontSize: '16px', transition: '0.2s', marginTop: '10px' },
  btnLink: { background: 'none', border: 'none', color: '#27ae60', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', padding: 0 }
};