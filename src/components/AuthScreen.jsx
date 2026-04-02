import { useState } from 'react'
import { sb } from '../services/supabase'


export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const ph = { background: "linear-gradient(135deg, #6B21E8 0%, #7B2FF2 50%, #9B5FF7 100%)", color: "#fff", padding: "48px 32px 56px", borderRadius: "0 0 40px 40px", boxShadow: "0 8px 32px rgba(107,33,232,0.3)", textAlign: "center" };
  const inp = { width: "100%", padding: "15px 16px", borderRadius: 14, border: "1.5px solid #E5E5E5", fontSize: 15, outline: "none", boxSizing: "border-box", background: "#FAFAFA", marginBottom: 12 };
  const btn = { background: "linear-gradient(135deg, #6B21E8, #7B2FF2)", color: "#fff", border: "none", borderRadius: 16, padding: "16px", width: "100%", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(123,47,242,0.35)", marginTop: 4 };

  const handleSubmit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) { setError("Digite seu nome"); setLoading(false); return; }
        const { data, error: e } = await sb.auth.signUp({ email, password, options: { data: { name } } });
        if (e) throw e;
        if (data?.user?.identities?.length === 0) { setError("Este email já está cadastrado. Faça login."); setLoading(false); return; }
        setSuccess("Conta criada! Verifique seu email para confirmar.");
      } else {
        const { error: e } = await sb.auth.signInWithPassword({ email, password });
        if (e) throw e;
        // onAuth será chamado pelo listener no componente pai
      }
    } catch (e) {
      if (e.message.includes("Invalid login")) setError("Email ou senha incorretos.");
      else if (e.message.includes("already registered")) setError("Email já cadastrado. Faça login.");
      else if (e.message.includes("Password should")) setError("Senha deve ter pelo menos 6 caracteres.");
      else setError(e.message || "Erro. Tente novamente.");
    }
    setLoading(false);
  };

  return (
    <div style={{ background: "#F2F0F8", minHeight: "100vh" }}>
      <div style={ph}>
        <div style={{ width: 100, height: 100, marginBottom: 8 }} />
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Quita</div>
        <div style={{ fontSize: 14, opacity: 0.75, marginTop: 6, fontWeight: 500 }}>O Duolingo das Finanças</div>
      </div>
      <div style={{ padding: "32px 24px" }}>
        <div style={{ display: "flex", background: "#EDE9FE", borderRadius: 16, padding: 4, marginBottom: 24 }}>
          {["login","signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
              style={{ flex: 1, padding: "10px", borderRadius: 13, border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", background: mode === m ? "#fff" : "transparent", color: mode === m ? "#7B2FF2" : "#9B8EBE", boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s" }}>
              {m === "login" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        {mode === "signup" && (
          <input style={inp} placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} />
        )}
        <input style={inp} placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input style={inp} placeholder="Senha (mín. 6 caracteres)" type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()} />

        {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#DC2626", marginBottom: 12, fontWeight: 500 }}>⚠️ {error}</div>}
        {success && <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#16A34A", marginBottom: 12, fontWeight: 500 }}>✅ {success}</div>}

        <button style={{ ...btn, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar minha conta"}
        </button>

        {mode === "login" && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <button onClick={async () => {
              if (!email) { setError("Digite seu email primeiro"); return; }
              setLoading(true);
              await sb.auth.resetPasswordForEmail(email);
              setSuccess("Email de recuperação enviado!"); setLoading(false);
            }} style={{ background: "none", border: "none", color: "#7B2FF2", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
              Esqueci minha senha
            </button>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#BBB", lineHeight: 1.6 }}>
          Seus dados ficam salvos na nuvem e<br/>acessíveis em qualquer dispositivo 🔒
        </div>
      </div>
    </div>
  );
}