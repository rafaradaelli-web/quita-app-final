import { useState } from 'react'
import { DEBT_TYPES, DEBT_ICONS, TYPE_DEFAULTS } from '../services/gameConfig'

export function calcDebtSummary(debt, extraPayment) {
  if (!debt) return null;
  var ep = extraPayment || 0;
  var mr = (debt.rate || 0) / 100;
  if (!mr || !debt.balance) return null;
  if (debt.type === "cartao" || debt.type === "cheque") {
    var pmt = (debt.installment || 0) + ep;
    if (pmt <= debt.balance * mr) return null;
    var s=debt.balance, tj=0, m=0;
    while (s>0.01 && m<600) { var j=s*mr; tj+=j; s=s+j-pmt; m++; }
    var sb=debt.balance, tjb=0, mb=0, pmtb=debt.installment||0;
    if (pmtb > debt.balance*mr) { while (sb>0.01 && mb<600) { var jb=sb*mr; tjb+=jb; sb=sb+jb-pmtb; mb++; } }
    var dq=new Date(); dq.setMonth(dq.getMonth()+m);
    return { totalJuros:Math.round(tj), meses:m, economia:Math.round(Math.max(0,tjb-tj)), dataQuitacao:dq, mesesBase:mb };
  }
  if (debt.amortization === "sac") {
    var n=debt.installmentsLeft||1, amortM=debt.balance/n, s2=debt.balance, tj2=0, m2=0;
    while (s2>0.01 && m2<600) { var j2=s2*mr; tj2+=j2; s2-=(amortM+ep); m2++; }
    var tjb2=0; for (var i=0;i<n;i++) { tjb2+=(debt.balance-i*(debt.balance/n))*mr; }
    var dq2=new Date(); dq2.setMonth(dq2.getMonth()+m2);
    return { totalJuros:Math.round(tj2), meses:m2, economia:Math.round(Math.max(0,tjb2-tj2)), dataQuitacao:dq2, mesesBase:n };
  }
  var pmt2=(debt.installment||0)+ep;
  if (pmt2<=0) return null;
  var s3=debt.balance, tj3=0, m3=0;
  while (s3>0.01 && m3<600) { var j3=s3*mr; var am3=pmt2-j3; if (am3<=0) break; tj3+=j3; s3-=am3; m3++; }
  var tjb3=Math.max(0,(debt.installment||0)*(debt.installmentsLeft||m3)-debt.balance);
  var dq3=new Date(); dq3.setMonth(dq3.getMonth()+m3);
  return { totalJuros:Math.round(tj3), meses:m3, economia:Math.round(Math.max(0,tjb3-tj3)), dataQuitacao:dq3, mesesBase:debt.installmentsLeft||m3 };
}

export function fmtM(v) { return (v||0).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0}); }
export function fmtM2(v) { return (v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }
export function fmtDt(d) { return d ? d.toLocaleDateString("pt-BR",{month:"short",year:"numeric"}) : "-"; }

export default function DebtCard({ debt, styles, onDelete, onCalc }) {
  var card=styles.card, btn=styles.btn, btnOut=styles.btnOut, input=styles.input;
  const [isOpen, setIsOpen] = useState(false);
  const [extraVal, setExtraVal] = useState("");
  var summary = onCalc(debt, 0);
  var summaryExtra = (extraVal && parseFloat(extraVal) > 0) ? onCalc(debt, parseFloat(extraVal)) : null;
  var typeLabel = (DEBT_TYPES.find(function(t){ return t.value===debt.type; })||{}).label || debt.type;
  var icon = DEBT_ICONS[debt.type] || "💰";
  return (
    <div style={card}>
      <div onClick={function(){ setIsOpen(!isOpen); }} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:44,height:44,borderRadius:14,background:"linear-gradient(135deg,#EDE9FE,#DDD6FE)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{icon}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:15,fontWeight:700,color:"#333",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{debt.name}</div>
          <div style={{fontSize:12,color:"#999",marginTop:2}}>{typeLabel} · {debt.rate}% a.m.</div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:16,fontWeight:700,color:"#EF4444"}}>R$ {fmtM(debt.balance)}</div>
          {summary && summary.totalJuros > 0 && <div style={{fontSize:11,color:"#BBB",marginTop:2}}>+R$ {fmtM(summary.totalJuros)} juros</div>}
        </div>
      </div>
      {isOpen && (
        <div style={{borderTop:"1px solid #F5F5F5",paddingTop:14,marginTop:14}}>
          {summary && summary.meses > 0 && (
            <div style={{background:"#FEF2F2",borderRadius:14,padding:14,marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:"#EF4444",marginBottom:10,letterSpacing:0.5}}>CENARIO ATUAL</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div style={{background:"#fff",borderRadius:10,padding:10,textAlign:"center"}}><div style={{fontSize:10,color:"#BBB",fontWeight:600}}>TOTAL JUROS</div><div style={{fontSize:16,fontWeight:700,color:"#EF4444",marginTop:4}}>R$ {fmtM(summary.totalJuros)}</div></div>
                <div style={{background:"#fff",borderRadius:10,padding:10,textAlign:"center"}}><div style={{fontSize:10,color:"#BBB",fontWeight:600}}>QUITACAO</div><div style={{fontSize:13,fontWeight:700,color:"#333",marginTop:4}}>{fmtDt(summary.dataQuitacao)}</div><div style={{fontSize:10,color:"#BBB"}}>{summary.meses} meses</div></div>
              </div>
            </div>
          )}
          <div style={{background:"#F0FDF4",borderRadius:14,padding:14,marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:700,color:"#16A34A",marginBottom:8,letterSpacing:0.5}}>SIMULAR PAGAMENTO EXTRA</div>
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {[50,100,200,500].map(function(v){ return (
                <button key={v} onClick={function(){ setExtraVal(String(v)); }}
                  style={{flex:1,padding:"6px 2px",borderRadius:10,border:"1.5px solid #BBF7D0",background:extraVal==v?"#16A34A":"#fff",color:extraVal==v?"#fff":"#16A34A",fontSize:11,cursor:"pointer",fontWeight:600}}>+{v}</button>
              ); })}
            </div>
            <input style={{...input,marginBottom:0}} placeholder="Ou outro valor (R$)" type="number" value={extraVal}
              onChange={function(e){ setExtraVal(e.target.value); }} />
            {summaryExtra && summaryExtra.meses > 0 && (
              <div style={{background:"#fff",borderRadius:12,padding:12,marginTop:10}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                  <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#BBB",fontWeight:600}}>NOVA QUITACAO</div><div style={{fontSize:13,fontWeight:700,color:"#16A34A",marginTop:4}}>{fmtDt(summaryExtra.dataQuitacao)}</div><div style={{fontSize:10,color:"#BBB"}}>{summaryExtra.meses} meses</div></div>
                  <div style={{textAlign:"center"}}><div style={{fontSize:10,color:"#BBB",fontWeight:600}}>ECONOMIA JUROS</div><div style={{fontSize:16,fontWeight:700,color:"#16A34A",marginTop:4}}>R$ {fmtM(summaryExtra.economia)}</div></div>
                </div>
                {summaryExtra.mesesBase > summaryExtra.meses && (
                  <div style={{background:"linear-gradient(135deg,#F0FDF4,#DCFCE7)",borderRadius:10,padding:10,textAlign:"center"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#16A34A"}}>{summaryExtra.mesesBase - summaryExtra.meses} meses mais rapido!</div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
            {debt.installment > 0 && <div style={{background:"#F8F8F8",borderRadius:10,padding:10,textAlign:"center"}}><div style={{fontSize:10,color:"#BBB",fontWeight:600}}>PARCELA</div><div style={{fontSize:14,fontWeight:700,color:"#333",marginTop:4}}>R$ {fmtM(debt.installment)}</div></div>}
            {debt.installmentsLeft > 0 && <div style={{background:"#F8F8F8",borderRadius:10,padding:10,textAlign:"center"}}><div style={{fontSize:10,color:"#BBB",fontWeight:600}}>PARCELAS REST.</div><div style={{fontSize:14,fontWeight:700,color:"#333",marginTop:4}}>{debt.installmentsLeft}x</div></div>}
            <div style={{background:"#F8F8F8",borderRadius:10,padding:10,textAlign:"center"}}><div style={{fontSize:10,color:"#BBB",fontWeight:600}}>TAXA MENSAL</div><div style={{fontSize:14,fontWeight:700,color:"#7B2FF2",marginTop:4}}>{debt.rate}% a.m.</div></div>
            {debt.amortization && <div style={{background:"#F8F8F8",borderRadius:10,padding:10,textAlign:"center"}}><div style={{fontSize:10,color:"#BBB",fontWeight:600}}>SISTEMA</div><div style={{fontSize:14,fontWeight:700,color:"#333",marginTop:4}}>{debt.amortization==="sac"?"SAC":debt.amortization==="price"?"Price":"Rotativo"}</div></div>}
          </div>
          <button onClick={function(){ onDelete(debt.id); }}
            style={{width:"100%",padding:"10px",borderRadius:14,border:"2px solid #EF4444",background:"transparent",color:"#EF4444",fontSize:13,fontWeight:600,cursor:"pointer"}}>
            Remover divida
          </button>
        </div>
      )}
    </div>
  );
}
