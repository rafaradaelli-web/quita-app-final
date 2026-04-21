import { useState } from 'react'
import { sb } from '../services/supabase'
import LegalScreen from './LegalScreen'
import { trackSignup, trackLogin } from '../services/analytics'

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [legalView, setLegalView] = useState(null);

  const handleSubmit = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) { setError("Digite seu nome"); setLoading(false); return; }
        if (!accepted) { setError("Aceite os Termos de Uso e Política de Privacidade"); setLoading(false); return; }
        const { data, error: e } = await sb.auth.signUp({ email, password, options: { data: { name } } });
        if (e) throw e;
        if (data?.user?.identities?.length === 0) { setError("Este email já está cadastrado. Faça login."); setLoading(false); return; }
        trackSignup('email');
        setSuccess("Conta criada! Verifique seu email para confirmar.");
      } else {
        const { error: e } = await sb.auth.signInWithPassword({ email, password });
        if (e) throw e;
        trackLogin('email');
      }
    } catch (e) {
      if (e.message.includes("Invalid login")) setError("Email ou senha incorretos.");
      else if (e.message.includes("already registered")) setError("Email já cadastrado. Faça login.");
      else if (e.message.includes("Password should")) setError("Senha deve ter pelo menos 6 caracteres.");
      else setError(e.message || "Erro. Tente novamente.");
    }
    setLoading(false);
  };

  if (legalView) return <LegalScreen type={legalView} onBack={() => setLegalView(null)} />

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #1E0A3C 0%, #2D1458 30%, #4C1D95 60%, #6D28D9 100%)',
      fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', paddingTop: 'calc(40px + var(--sat, 0px))', paddingBottom: 8 }}>
        <img src="/models/quita-celebrate.png" alt="Quita" style={{ width: 180, height: 180, objectFit: 'contain', margin: '0 auto', display: 'block' }} />
        <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: -1, marginTop: 4 }}>Quita</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', fontWeight: 500, marginTop: 4 }}>Sua mentora financeira particular</div>
      </div>

      {/* Card form */}
      <div style={{
        flex: 1, background: '#F0EDF8', borderRadius: '32px 32px 0 0',
        marginTop: 16, padding: '28px 24px',
        paddingBottom: 'calc(24px + var(--sab, 0px))',
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', background: '#EDE9FE', borderRadius: 16, padding: 4, marginBottom: 24 }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); setSuccess(""); }}
              style={{
                flex: 1, padding: 12, borderRadius: 13, border: 'none', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.2s',
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? '#7C3AED' : '#9B8EBE',
                boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              }}>
              {m === "login" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        {/* Inputs */}
        {mode === "signup" && (
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome"
            style={{
              width: '100%', padding: '15px 18px', borderRadius: 14, fontSize: 15, outline: 'none',
              boxSizing: 'border-box', marginBottom: 10,
              border: '1.5px solid rgba(124,58,237,0.12)', background: '#fff',
              color: '#1A0A2E',
            }} />
        )}

        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email"
          style={{
            width: '100%', padding: '15px 18px', borderRadius: 14, fontSize: 15, outline: 'none',
            boxSizing: 'border-box', marginBottom: 10,
            border: '1.5px solid rgba(124,58,237,0.12)', background: '#fff',
            color: '#1A0A2E',
          }} />

        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Senha (mín. 6 caracteres)" type="password"
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          style={{
            width: '100%', padding: '15px 18px', borderRadius: 14, fontSize: 15, outline: 'none',
            boxSizing: 'border-box', marginBottom: 10,
            border: '1.5px solid rgba(124,58,237,0.12)', background: '#fff',
            color: '#1A0A2E',
          }} />

        {/* Checkbox termos */}
        {mode === "signup" && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, marginTop: 4 }}>
            <div onClick={() => setAccepted(!accepted)}
              style={{
                width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1, cursor: 'pointer',
                border: accepted ? 'none' : '2px solid #D4D4D8',
                background: accepted ? 'linear-gradient(135deg,#7C3AED,#6D28D9)' : '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
              }}>
              {accepted && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
            </div>
            <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
              Li e concordo com os{' '}
              <span onClick={() => setLegalView('termos')} style={{ color: '#7C3AED', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Termos de Uso</span>
              {' '}e a{' '}
              <span onClick={() => setLegalView('privacidade')} style={{ color: '#7C3AED', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>Política de Privacidade</span>
            </div>
          </div>
        )}

        {/* Errors */}
        {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#DC2626', marginBottom: 12, fontWeight: 500 }}>{error}</div>}
        {success && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#16A34A', marginBottom: 12, fontWeight: 500 }}>{success}</div>}

        {/* Button */}
        <button onClick={handleSubmit} disabled={loading || (mode === 'signup' && !accepted)}
          style={{
            width: '100%', padding: 16, borderRadius: 16, border: 'none', fontSize: 16, fontWeight: 700,
            cursor: loading || (mode === 'signup' && !accepted) ? 'default' : 'pointer',
            background: loading || (mode === 'signup' && !accepted) ? '#D4D4D8' : 'linear-gradient(160deg, #1E0A3C, #3B1578, #6D28D9)',
            color: loading || (mode === 'signup' && !accepted) ? '#999' : '#fff',
            boxShadow: loading || (mode === 'signup' && !accepted) ? 'none' : '0 4px 16px rgba(30,10,60,0.35)',
            transition: 'all 0.2s', marginTop: 4,
          }}>
          {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar minha conta"}
        </button>

        {/* Forgot password */}
        {mode === "login" && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button onClick={async () => {
              if (!email) { setError("Digite seu email primeiro"); return; }
              setLoading(true);
              await sb.auth.resetPasswordForEmail(email);
              setSuccess("Email de recuperação enviado!"); setLoading(false);
            }} style={{ background: 'none', border: 'none', color: '#7C3AED', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
              Esqueci minha senha
            </button>
          </div>
        )}

        {/* Footer links */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#BBB', lineHeight: 1.6 }}>
          <span onClick={() => setLegalView('termos')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Termos de Uso</span>
          {' · '}
          <span onClick={() => setLegalView('privacidade')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>Política de Privacidade</span>
        </div>
      </div>
    </div>
  );
}
