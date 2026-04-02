import { useState } from 'react'
import { RECEITA_TIPOS } from '../services/gameConfig'

export default function ReceitasScreen({ state, styles, addReceita, deleteReceita }) {
  var ph=styles.ph, card=styles.card, btn=styles.btn, btnOut=styles.btnOut, input=styles.input, NavBar=styles.NavBar;
  var receitas = state.receitas || [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:"", amount:"", tipo:"salario", recorrente:true, data:new Date().toISOString().slice(0,10) });

  var now = new Date();
  var mesAtual = now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0");

  // Receitas do mês atual
  var receitasMes = receitas.filter(function(r){
    var d = new Date(r.date);
    var m = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    return m === mesAtual;
  });
  // Receitas recorrentes (salário, aluguel) — contam sempre
  var recorrentes = receitas.filter(function(r){ return r.recorrente; });
  // Soma do mês = avulsas do mês + recorrentes
  var totalMes = receitasMes.reduce(function(s,r){ return s+r.amount; },0)
    + recorrentes.filter(function(r){
        var d=new Date(r.date); var m=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
        return m !== mesAtual; // já contadas acima se do mês
      }).reduce(function(s,r){ return s+r.amount; },0);

  // Renda total real = soma das receitas recorrentes + avulsas do mês
  var rendaReal = receitas.reduce(function(s,r){
    if (r.recorrente) return s+r.amount;
    var d=new Date(r.date); var m=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    return m===mesAtual ? s+r.amount : s;
  },0);

  // Agrupar por tipo
  var porTipo = {};
  receitas.forEach(function(r){ porTipo[r.tipo]=(porTipo[r.tipo]||0)+r.amount; });

  function handleSubmit() {
    if (!form.name||!form.amount) return;
    addReceita({ name:form.name, amount:parseFloat(form.amount), tipo:form.tipo, recorrente:form.recorrente, dataStr:form.data });
    setForm({ name:"", amount:"", tipo:"salario", recorrente:true, data:new Date().toISOString().slice(0,10) });
    setShowForm(false);
  }
  function setF(k,v){ setForm(function(p){ var n={...p}; n[k]=v; return n; }); }

  return (
    <div style={{background:"#F2F0F8",minHeight:"100vh"}}>
      <div style={ph}>
        <div style={{fontSize:13,opacity:0.7,fontWeight:500}}>Suas receitas</div>
        <div style={{fontSize:30,fontWeight:700,letterSpacing:-0.5}}>R$ {fmtM(rendaReal)}<span style={{fontSize:14,fontWeight:500,opacity:0.75}}>/mês</span></div>
        <div style={{fontSize:12,opacity:0.65,marginTop:2}}>{receitas.length} {receitas.length===1?"receita":"receitas"} cadastradas</div>
      </div>
      <div style={{padding:16}}>
        <button style={{...btn,marginBottom:16}} onClick={function(){ setShowForm(!showForm); }}>
          {showForm?"Cancelar":"+ Registrar receita"}
        </button>
        {showForm && (
          <div style={{...card,padding:20,marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:700,color:"#333",marginBottom:14}}>Nova receita</div>
            <input style={{...input,marginBottom:10}} placeholder="Descrição (ex: Salário Empresa X)" value={form.name}
              onChange={function(e){ setF("name",e.target.value); }} autoFocus />
            <input style={{...input,marginBottom:10}} placeholder="Valor (R$)" type="number" value={form.amount}
              onChange={function(e){ setF("amount",e.target.value); }} />
            <input style={{...input,marginBottom:12}} type="date" value={form.data}
              onChange={function(e){ setF("data",e.target.value); }} />
            <div style={{fontSize:11,color:"#9B8EBE",fontWeight:700,marginBottom:8,letterSpacing:0.5}}>TIPO</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
              {RECEITA_TIPOS.map(function(t){ return (
                <button key={t.value} onClick={function(){ setF("tipo",t.value); setF("recorrente",t.recorrente); }}
                  style={{padding:"10px 6px",borderRadius:12,border:form.tipo===t.value?"2px solid #7B2FF2":"1.5px solid #E5E5E5",background:form.tipo===t.value?"#EDE9FE":"#fff",color:form.tipo===t.value?"#7B2FF2":"#666",fontSize:12,cursor:"pointer",fontWeight:form.tipo===t.value?700:400,textAlign:"center"}}>
                  {t.icon} {t.label}
                </button>
              ); })}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,background:"#F8F8F8",borderRadius:12,padding:"12px 14px"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,color:"#333"}}>Receita recorrente?</div>
                <div style={{fontSize:12,color:"#999"}}>Conta todo mês automaticamente</div>
              </div>
              <div onClick={function(){ setF("recorrente",!form.recorrente); }}
                style={{width:44,height:24,borderRadius:12,background:form.recorrente?"#7B2FF2":"#DDD",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                <div style={{position:"absolute",top:2,left:form.recorrente?20:2,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button style={{...btn,flex:1}} onClick={handleSubmit}>Salvar (+10 XP)</button>
              <button style={{...btnOut,flex:1}} onClick={function(){ setShowForm(false); }}>Cancelar</button>
            </div>
          </div>
        )}
        {receitas.length===0 && !showForm && (
          <div style={{...card,textAlign:"center",padding:40}}>
            
            <div style={{fontSize:15,fontWeight:700,color:"#999",marginBottom:6}}>Nenhuma receita ainda</div>
            <div style={{fontSize:13,color:"#BBB"}}>Cadastre sua renda para ativar o diagnóstico financeiro completo</div>
          </div>
        )}
        {receitas.length > 0 && (
          <div style={{...card,background:"linear-gradient(135deg,#F0FDF4,#DCFCE7)",border:"none",marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,color:"#16A34A",letterSpacing:0.5,marginBottom:12}}>RESUMO DO MÊS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{textAlign:"center",background:"rgba(255,255,255,0.7)",borderRadius:12,padding:10}}>
                <div style={{fontSize:10,color:"#999",fontWeight:600}}>RENDA MENSAL</div>
                <div style={{fontSize:18,fontWeight:700,color:"#16A34A",marginTop:4}}>R$ {fmtM(rendaReal)}</div>
              </div>
              <div style={{textAlign:"center",background:"rgba(255,255,255,0.7)",borderRadius:12,padding:10}}>
                <div style={{fontSize:10,color:"#999",fontWeight:600}}>RECORRENTES</div>
                <div style={{fontSize:18,fontWeight:700,color:"#7B2FF2",marginTop:4}}>{receitas.filter(function(r){ return r.recorrente; }).length}</div>
              </div>
            </div>
          </div>
        )}
        {/* Recorrentes */}
        {receitas.filter(function(r){ return r.recorrente; }).length > 0 && (
          <div style={card}>
            <div style={{fontSize:11,fontWeight:700,color:"#9B8EBE",marginBottom:12,letterSpacing:0.5}}>RECEITAS FIXAS (todo mês)</div>
            {receitas.filter(function(r){ return r.recorrente; }).map(function(r){
              var tipo = RECEITA_TIPOS.find(function(t){ return t.value===r.tipo; })||{icon:"💰",label:r.tipo};
              return (
                <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #F5F5F5"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#F0FDF4,#DCFCE7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{tipo.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
                    <div style={{fontSize:12,color:"#999",marginTop:2}}>{tipo.label} · recorrente</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:15,fontWeight:700,color:"#16A34A"}}>R$ {fmtM(r.amount)}</div>
                    <button onClick={function(){ deleteReceita(r.id); }} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#CCC",marginTop:2}}>remover</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Avulsas */}
        {receitas.filter(function(r){ return !r.recorrente; }).length > 0 && (
          <div style={card}>
            <div style={{fontSize:11,fontWeight:700,color:"#9B8EBE",marginBottom:12,letterSpacing:0.5}}>RECEITAS AVULSAS</div>
            {receitas.filter(function(r){ return !r.recorrente; }).sort(function(a,b){ return b.date-a.date; }).map(function(r){
              var tipo = RECEITA_TIPOS.find(function(t){ return t.value===r.tipo; })||{icon:"💰",label:r.tipo};
              return (
                <div key={r.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #F5F5F5"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#EDE9FE,#DDD6FE)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{tipo.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div>
                    <div style={{fontSize:12,color:"#999",marginTop:2}}>{tipo.label} · {new Date(r.date).toLocaleDateString("pt-BR")}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:15,fontWeight:700,color:"#7B2FF2"}}>R$ {fmtM(r.amount)}</div>
                    <button onClick={function(){ deleteReceita(r.id); }} style={{background:"none",border:"none",cursor:"pointer",fontSize:11,color:"#CCC",marginTop:2}}>remover</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{height:20}}/><NavBar/>
    </div>
  );
}