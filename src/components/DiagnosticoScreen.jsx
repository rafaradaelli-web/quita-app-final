import { useState } from 'react'
import { CAT_NORM, CAT_GRUPOS, CATEGORIES } from '../services/gameConfig'

export default function DiagnosticoScreen({ state, styles, setScreen }) {
  var ph=styles.ph, card=styles.card, btn=styles.btn, input=styles.input, NavBar=styles.NavBar;
  var income = (state.receitas||[]).reduce(function(s,r){ return s+(r.recorrente?r.amount:0); },0) || state.income || 0;
  var expenses = (state.expenses || []).filter(function(e){ return !e.oculto; });
  var debts = state.debts || [];
  var goals = state.goals || [];
  var now = Date.now();
  var msMonth = 30 * 86400000;
  var last30 = expenses.filter(function(e){ return now - e.date < msMonth && !e.oculto; });
  var prev30 = expenses.filter(function(e){ return !e.oculto && now-e.date >= msMonth && now-e.date < 2*msMonth; });
  var gastosMes = last30.reduce(function(s,e){ return s+e.amount; },0);
  var gastosPrev = prev30.reduce(function(s,e){ return s+e.amount; },0);
  var variacaoGastos = gastosPrev > 0 ? ((gastosMes-gastosPrev)/gastosPrev)*100 : 0;
  var parcelasMes = debts.reduce(function(s,d){ return s+(d.installment||0); },0);
  var totalJurosMes = debts.reduce(function(s,d){
    var r=calcDebtSummary(d,0); if(!r||!r.meses) return s; return s+(r.totalJuros/r.meses);
  },0);
  var comprometimento = income>0 ? ((parcelasMes+gastosMes)/income)*100 : 0;
  var comprometimentoDividas = income>0 ? (parcelasMes/income)*100 : 0;
  var sobraMensal = income - gastosMes - parcelasMes;
  var catMap = {};
  last30.forEach(function(e){ catMap[e.category]=(catMap[e.category]||0)+e.amount; });
  var catArr = Object.keys(catMap).map(function(k){ return {cat:k,val:catMap[k]}; }).sort(function(a,b){ return b.val-a.val; });
  var catPrevMap = {};
  prev30.forEach(function(e){ catPrevMap[e.category]=(catPrevMap[e.category]||0)+e.amount; });
  var catsCrescendo = catArr.filter(function(c){ return catPrevMap[c.cat] && c.val>catPrevMap[c.cat]*1.2; });
  var maiorCat = catArr[0]||null;
  var divMaisCara = debts.slice().sort(function(a,b){ return (b.rate||0)-(a.rate||0); })[0]||null;
  var divMaisCaraSummary = divMaisCara ? calcDebtSummary(divMaisCara,0) : null;
  var extraIdeal = divMaisCara&&sobraMensal>0 ? Math.min(sobraMensal*0.3,500) : 0;
  var divMaisCaraExtra = divMaisCara&&extraIdeal>0 ? calcDebtSummary(divMaisCara,extraIdeal) : null;
  var metaMaisProx = goals.filter(function(g){ return g.saved<g.target; }).sort(function(a,b){ return (b.saved/b.target)-(a.saved/a.target); })[0]||null;
  var score=50;
  if (income>0) {
    if (comprometimentoDividas<20) score+=15; else if (comprometimentoDividas<30) score+=8; else if (comprometimentoDividas>40) score-=15;
    if (sobraMensal>0) score+=10; else score-=20;
    if (variacaoGastos<0) score+=8; else if (variacaoGastos>20) score-=8;
    if (goals.some(function(g){ return g.saved>0; })) score+=7;
    if (debts.length===0) score+=10;
    score=Math.max(0,Math.min(100,score));
  }
  var scoreColor = score>=75?"#16A34A":score>=50?"#F59E0B":"#EF4444";

  var scoreBg = score>=75?"linear-gradient(135deg,#F0FDF4,#DCFCE7)":score>=50?"linear-gradient(135deg,#FFFBEB,#FEF3C7)":"linear-gradient(135deg,#FEF2F2,#FFE4E6)";
  var scoreLabel = score>=75?"Saudavel":score>=50?"Atencao":"Critico";
  var alertas=[], atencoes=[], oportunidades=[];
  if (income===0) alertas.push({icon:"📊",title:"Cadastre suas receitas",desc:"Sem receitas cadastradas, nao e possivel calcular comprometimento, sobra mensal e gerar insights.",action:"Ver Receitas",screen:"receitas"});
  if (comprometimentoDividas>40) alertas.push({icon:"🚨",title:"Parcelas acima do limite",desc:"Suas parcelas consomem "+Math.round(comprometimentoDividas)+"% da renda. Ideal e abaixo de 30%. Risco de inadimplencia.",action:null});
  if (sobraMensal<0) alertas.push({icon:"🔴",title:"Saldo mensal negativo",desc:"Voce esta gastando R$ "+fmtM(Math.abs(sobraMensal))+" a mais do que ganha. Insustentavel a longo prazo.",action:null});
  if (debts.some(function(d){ return d.type==="cartao"&&d.rate>10; })) alertas.push({icon:"💳",title:"Cartao rotativo ativo",desc:"O rotativo do cartao e a divida mais cara do Brasil — media de 15-20% ao mes. Prioridade maxima.",action:"Ver Dividas",screen:"debts"});
  if (comprometimentoDividas>20&&comprometimentoDividas<=40) atencoes.push({icon:"🟡",title:"Comprometimento elevado",desc:Math.round(comprometimentoDividas)+"% da renda vai para parcelas. Monitore para nao ultrapassar 30%.",action:null});
  if (variacaoGastos>15) atencoes.push({icon:"📈",title:"Gastos crescendo "+Math.round(variacaoGastos)+"%",desc:"Seus gastos subiram em relacao ao mes anterior. Verifique o que mudou.",action:"Ver Gastos",screen:"expenses"});
  if (catsCrescendo.length>0) atencoes.push({icon:"👀",title:catsCrescendo[0].cat+" em alta",desc:"Gasto com "+catsCrescendo[0].cat+" subiu mais de 20% esse mes. Vale revisar.",action:"Ver Gastos",screen:"expenses"});
  if (metaMaisProx&&!goals.some(function(g){ return g.saved>0; })) atencoes.push({icon:"🎯",title:"Metas sem progresso",desc:"Voce tem metas mas sem aportes. Comece com qualquer valor — o habito importa mais.",action:"Ver Metas",screen:"goals"});
  if (divMaisCaraExtra&&divMaisCaraSummary&&divMaisCaraExtra.mesesBase>divMaisCaraExtra.meses) {
    var mg=divMaisCaraSummary.meses-divMaisCaraExtra.meses;
    oportunidades.push({icon:"⚡",title:"Quite "+mg+" meses mais rapido",desc:"Pagando R$ "+fmtM(extraIdeal)+" a mais no "+divMaisCara.name+", voce economiza R$ "+fmtM(divMaisCaraExtra.economia)+" em juros e quita "+mg+" meses antes.",action:"Ver Dividas",screen:"debts"});
  }
  if (maiorCat&&income>0&&(maiorCat.val/income)>0.2) {
    var ep=maiorCat.val*0.3;
    oportunidades.push({icon:"✂️",title:"Cortar "+maiorCat.cat+" libera R$ "+fmtM(ep)+"/mes",desc:"Reduzindo 30% no maior gasto, voce libera R$ "+fmtM(ep)+" por mes para dividas ou poupanca.",action:"Ver Gastos",screen:"expenses"});
  }
  if (sobraMensal>200&&metaMaisProx) {
    var mo=Math.ceil((metaMaisProx.target-metaMaisProx.saved)/sobraMensal);
    oportunidades.push({icon:"🎉",title:"Meta '"+metaMaisProx.name+"' em "+mo+" "+(mo===1?"mes":"meses"),desc:"Com sua sobra de R$ "+fmtM(sobraMensal)+"/mes, voce atinge essa meta em "+mo+" "+(mo===1?"mes":"meses")+".",action:"Ver Metas",screen:"goals"});
  }
  function AlertCard({ items, color, bgCard, label }) {
    if (!items||items.length===0) return null;
    return (
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:color,marginBottom:8,letterSpacing:0.5}}>{label}</div>
        {items.map(function(a,i){ return (
          <div key={i} style={{background:bgCard,borderRadius:16,padding:16,marginBottom:8,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
              <span style={{fontSize:20,flexShrink:0,marginTop:1}}>{a.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:700,color:"#333",marginBottom:4}}>{a.title}</div>
                <div style={{fontSize:13,color:"#555",lineHeight:1.5}}>{a.desc}</div>
                {a.action&&a.screen&&(
                  <button onClick={function(){ setScreen(a.screen); }}
                    style={{marginTop:10,padding:"7px 14px",borderRadius:10,border:"1.5px solid "+color,background:"transparent",color:color,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    {a.action}
                  </button>
                )}
              </div>
            </div>
          </div>
        ); })}
      </div>
    );
  }
  return (
    <div style={{background:"#F2F0F8",minHeight:"100vh"}}>
      <div style={ph}>
        <div style={{fontSize:13,opacity:0.7,fontWeight:500}}>Diagnostico Financeiro</div>
        <div style={{fontSize:26,fontWeight:700,letterSpacing:-0.5}}>Saude do dinheiro</div>
        <div style={{fontSize:12,opacity:0.65,marginTop:2}}>Analise baseada nos seus dados reais</div>
      </div>
      <div style={{padding:16}}>
        <div style={{...card,background:scoreBg,border:"none",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{textAlign:"center",flexShrink:0}}>
              
              <div style={{fontSize:20,fontWeight:800,color:scoreColor,marginTop:4}}>{score}</div>
            </div>
            <div>
              <div style={{fontSize:20,fontWeight:800,color:scoreColor}}>{scoreLabel}</div>
              <div style={{fontSize:13,color:"#555",marginTop:4,lineHeight:1.4}}>{score>=75?"Voce esta no caminho certo!":score>=50?"Ha pontos de atencao abaixo.":"Situacao critica. Veja as acoes urgentes."}</div>
            </div>
          </div>
          {income>0&&(
            <div style={{marginTop:14,background:"rgba(255,255,255,0.65)",borderRadius:12,padding:12}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,textAlign:"center"}}>
                <div><div style={{fontSize:10,color:"#999",fontWeight:600}}>COMPROMETIDO</div><div style={{fontSize:15,fontWeight:700,color:comprometimento>70?"#EF4444":comprometimento>50?"#F59E0B":"#16A34A",marginTop:2}}>{Math.round(comprometimento)}%</div></div>
                <div><div style={{fontSize:10,color:"#999",fontWeight:600}}>SOBRA/MES</div><div style={{fontSize:15,fontWeight:700,color:sobraMensal<0?"#EF4444":"#16A34A",marginTop:2}}>R$ {fmtM(sobraMensal)}</div></div>
                <div><div style={{fontSize:10,color:"#999",fontWeight:600}}>JUROS/MES</div><div style={{fontSize:15,fontWeight:700,color:"#F97316",marginTop:2}}>R$ {fmtM(totalJurosMes)}</div></div>
              </div>
            </div>
          )}
        </div>
        {income===0&&(
          <div style={{...card,textAlign:"center",padding:24,background:"linear-gradient(135deg,#FEF2F2,#FFE4E6)",border:"none"}}>
            <div style={{fontSize:24,marginBottom:8}}>📊</div>
            <div style={{fontSize:14,fontWeight:700,color:"#EF4444",marginBottom:6}}>Cadastre sua renda para ativar</div>
            <div style={{fontSize:13,color:"#666",marginBottom:14}}>Com a renda, consigo calcular comprometimento real, sobra mensal e gerar insights personalizados.</div>
            <button onClick={function(){ setScreen("profile"); }} style={{...btn,maxWidth:220,margin:"0 auto"}}>Cadastrar renda</button>
          </div>
        )}
        <AlertCard items={alertas} color="#EF4444" bgCard="#fff" label="ALERTAS CRITICOS" />
        <AlertCard items={atencoes} color="#F59E0B" bgCard="#fff" label="PONTOS DE ATENCAO" />
        <AlertCard items={oportunidades} color="#16A34A" bgCard="#fff" label="OPORTUNIDADES" />
        {alertas.length===0&&atencoes.length===0&&oportunidades.length===0&&income>0&&(
          <div style={{...card,textAlign:"center",padding:32}}>
            <div style={{fontSize:36,marginBottom:12}}>🐷</div>
            <div style={{fontSize:15,fontWeight:700,color:"#333",marginBottom:6}}>Tudo certo!</div>
            <div style={{fontSize:13,color:"#999"}}>Continue registrando seus dados para insights mais precisos.</div>
          </div>
        )}
        {catArr.length>0&&(
          <div style={card}>
            <div style={{fontSize:11,fontWeight:700,color:"#9B8EBE",marginBottom:12,letterSpacing:0.5}}>GASTOS POR CATEGORIA (30 DIAS)</div>
            {catArr.slice(0,5).map(function(c){
              var pct=gastosMes>0?(c.val/gastosMes)*100:0;
              var prev=catPrevMap[c.cat]||0;
              var trend=prev>0?((c.val-prev)/prev)*100:0;
              return (
                <div key={c.cat} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:13,fontWeight:600,color:"#333"}}>{c.cat}</span>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      {prev>0&&<span style={{fontSize:11,color:trend>10?"#EF4444":trend<-10?"#16A34A":"#BBB",fontWeight:600}}>{trend>0?"+":""}{Math.round(trend)}%</span>}
                      <span style={{fontSize:13,fontWeight:700,color:"#7B2FF2"}}>R$ {fmtM(c.val)}</span>
                    </div>
                  </div>
                  <div style={{background:"#EDE9FE",borderRadius:6,height:6}}><div style={{background:"linear-gradient(90deg,#6B21E8,#9B5FF7)",borderRadius:6,height:"100%",width:Math.round(pct)+"%"}}/></div>
                </div>
              );
            })}
          </div>
        )}
        {debts.length>0&&(
          <div style={card}>
            <div style={{fontSize:11,fontWeight:700,color:"#9B8EBE",marginBottom:12,letterSpacing:0.5}}>PROJECAO DE QUITACAO</div>
            {debts.map(function(d){
              var r=calcDebtSummary(d,0); if(!r||!r.meses) return null;
              return (
                <div key={d.id} style={{marginBottom:14,paddingBottom:14,borderBottom:"1px solid #F5F5F5"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                    <span style={{fontSize:13,fontWeight:700,color:"#333"}}>{d.name}</span>
                    <span style={{fontSize:11,color:"#999"}}>{fmtDt(r.dataQuitacao)}</span>
                  </div>
                  <div style={{fontSize:12,color:"#999",marginBottom:6}}>R$ {fmtM(d.balance)} em aberto · +R$ {fmtM(r.totalJuros)} juros · {r.meses} meses</div>
                  <div style={{background:"#EDE9FE",borderRadius:6,height:6}}><div style={{background:"linear-gradient(90deg,#EF4444,#F97316)",borderRadius:6,height:"100%",width:"100%"}}/></div>
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