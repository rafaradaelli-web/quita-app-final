import { useState } from 'react'
import { DEBT_TYPES, DEBT_ICONS, TYPE_DEFAULTS } from '../services/gameConfig'
import DebtCard, { calcDebtSummary, fmtM, fmtM2, fmtDt } from './DebtCard'

export default function DebtsScreen({ state, styles, addDebt, deleteDebt, NavBar }) {
  var ph=styles.ph, card=styles.card, btn=styles.btn, btnOut=styles.btnOut, input=styles.input;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:"", type:"cartao", balance:"", rate:"", installment:"", installmentsLeft:"", amortization:"price", dueDay:"" });
  var needsInstallments = form.type!=="cartao" && form.type!=="cheque";
  var totalDebts = state.debts.reduce(function(s,d){ return s+(parseFloat(d.balance)||0); },0);
  var totalJurosPrev = state.debts.reduce(function(s,d){ var r=calcDebtSummary(d,0); return s+(r?r.totalJuros:0); },0);

  function handleSubmit() {
    if (!form.name||!form.balance||!form.rate) return;
    addDebt({ name:form.name, type:form.type, balance:parseFloat(form.balance), rate:parseFloat(form.rate),
      installment:parseFloat(form.installment)||0, installmentsLeft:parseInt(form.installmentsLeft)||0,
      amortization:form.amortization, dueDay:parseInt(form.dueDay)||1 });
    setForm({ name:"", type:"cartao", balance:"", rate:"", installment:"", installmentsLeft:"", amortization:"price", dueDay:"" });
    setShowForm(false);
  }
  function setF(key, val) { setForm(function(p){ var n={...p}; n[key]=val; return n; }); }

  return (
    <div style={{background:"#F2F0F8",minHeight:"100vh"}}>
      <div style={ph}>
        <div style={{fontSize:13,opacity:0.7,fontWeight:500}}>Suas dividas</div>
        <div style={{fontSize:28,fontWeight:700,letterSpacing:-0.5}}>R$ {fmtM(totalDebts)}</div>
        <div style={{fontSize:12,opacity:0.65,marginTop:2}}>{state.debts.length} {state.debts.length===1?"divida":"dividas"} cadastradas</div>
      </div>
      <div style={{padding:16}}>
        <button style={{...btn,marginBottom:16}} onClick={function(){ setShowForm(!showForm); }}>{showForm?"Cancelar":"+ Cadastrar divida"}</button>
        {showForm && (
          <div style={{...card,padding:20,marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:700,color:"#333",marginBottom:14}}>Nova divida</div>
            <input style={{...input,marginBottom:10}} placeholder="Nome (ex: Cartao Nubank)" value={form.name} onChange={function(e){ setF("name",e.target.value); }} autoFocus />
            <div style={{fontSize:11,color:"#9B8EBE",fontWeight:700,marginBottom:8,letterSpacing:0.5}}>TIPO</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
              {DEBT_TYPES.map(function(t){ return (
                <button key={t.value} onClick={function(){ setForm(function(p){ return {...p,type:t.value,amortization:(TYPE_DEFAULTS[t.value]||{}).amortization||"price"}; }); }}
                  style={{padding:"10px 6px",borderRadius:12,border:form.type===t.value?"2px solid #7B2FF2":"1.5px solid #E5E5E5",background:form.type===t.value?"#EDE9FE":"#fff",color:form.type===t.value?"#7B2FF2":"#666",fontSize:12,cursor:"pointer",fontWeight:form.type===t.value?700:400,textAlign:"center"}}>
                  {DEBT_ICONS[t.value]} {t.label}
                </button>
              ); })}
            </div>
            <input style={{...input,marginBottom:10}} placeholder="Saldo devedor (R$)" type="number" value={form.balance} onChange={function(e){ setF("balance",e.target.value); }} />
            <input style={{...input,marginBottom:10}} placeholder={(TYPE_DEFAULTS[form.type]||{}).rateLabel||"Taxa mensal (%)"} type="number" value={form.rate} onChange={function(e){ setF("rate",e.target.value); }} />
            <input style={{...input,marginBottom:10}} placeholder="Parcela atual (R$)" type="number" value={form.installment} onChange={function(e){ setF("installment",e.target.value); }} />
            {needsInstallments && (
              <div>
                <input style={{...input,marginBottom:10}} placeholder="Parcelas restantes" type="number" value={form.installmentsLeft} onChange={function(e){ setF("installmentsLeft",e.target.value); }} />
                <div style={{fontSize:11,color:"#9B8EBE",fontWeight:700,marginBottom:8,letterSpacing:0.5}}>SISTEMA</div>
                <div style={{display:"flex",gap:6,marginBottom:12}}>
                  {[["price","Price (parcela fixa)"],["sac","SAC (amort. const.)"]].map(function(item){ return (
                    <button key={item[0]} onClick={function(){ setF("amortization",item[0]); }}
                      style={{flex:1,padding:"10px 6px",borderRadius:12,border:form.amortization===item[0]?"2px solid #7B2FF2":"1.5px solid #E5E5E5",background:form.amortization===item[0]?"#EDE9FE":"#fff",color:form.amortization===item[0]?"#7B2FF2":"#666",fontSize:11,cursor:"pointer",fontWeight:form.amortization===item[0]?700:400,textAlign:"center"}}>
                      {item[1]}
                    </button>
                  ); })}
                </div>
              </div>
            )}
            <input style={{...input,marginBottom:14}} placeholder="Dia vencimento (ex: 10)" type="number" value={form.dueDay} onChange={function(e){ setF("dueDay",e.target.value); }} />
            <div style={{display:"flex",gap:8}}>
              <button style={{...btn,flex:1}} onClick={handleSubmit}>Salvar (+20 XP)</button>
              <button style={{...btnOut,flex:1}} onClick={function(){ setShowForm(false); }}>Cancelar</button>
            </div>
          </div>
        )}
        {state.debts.length===0 && !showForm && (
          <div style={{textAlign:"center",padding:48}}>
            
            <div style={{fontSize:15,fontWeight:700,color:"#999",marginBottom:6}}>Nenhuma dívida cadastrada</div>
            <div style={{fontSize:13,color:"#BBB"}}>Cadastre suas dívidas para ver o plano de quitação e economizar em juros</div>
          </div>
        )}
        {state.debts.length > 0 && (
          <div style={{background:"linear-gradient(135deg,#FEF2F2,#FFE4E6)",borderRadius:20,padding:18,marginBottom:16,boxShadow:"0 2px 12px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#EF4444",letterSpacing:0.5,marginBottom:10}}>RESUMO GERAL</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#999",fontWeight:600}}>TOTAL EM ABERTO</div><div style={{fontSize:18,fontWeight:700,color:"#EF4444",marginTop:4}}>R$ {fmtM(totalDebts)}</div></div>
              <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#999",fontWeight:600}}>JUROS PREVISTOS</div><div style={{fontSize:18,fontWeight:700,color:"#F97316",marginTop:4}}>R$ {fmtM(totalJurosPrev)}</div></div>
            </div>
          </div>
        )}
        {state.debts.map(function(d){ return (
          <DebtCard key={d.id} debt={d} styles={{card,btn,btnOut,input}} onDelete={deleteDebt} onCalc={calcDebtSummary} />
        ); })}
      </div>
      <div style={{height:20}}/><NavBar/>
    </div>
  );
}
