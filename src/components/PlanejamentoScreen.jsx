import { useState } from 'react'
import { CAT_NORM, CAT_GRUPOS, CATEGORIES } from '../services/gameConfig'

function getGrupo(cat) {
  var norm = CAT_NORM[cat] || cat;
  return CAT_GRUPOS[norm] || "outros";
}

function analisarFluxo(state) {
  var expenses = (state.expenses || []).filter(function(e){ return !e.oculto; });
  var receitas = state.receitas || [];
  var debts = state.debts || [];
  var now = Date.now();
  var msMonth = 30 * 86400000;

  // Renda mensal real (recorrentes + média avulsas últimos 3 meses)
  var recorrentesTotal = receitas.filter(function(r){ return r.recorrente; })
    .reduce(function(s,r){ return s+r.amount; },0);
  var avulsas3m = receitas.filter(function(r){
    return !r.recorrente && now - r.date < 90*86400000;
  }).reduce(function(s,r){ return s+r.amount; },0) / 3;
  var rendaMensal = recorrentesTotal + avulsas3m || state.income || 0;

  // Gastos por mês (últimos 3 meses)
  var meses = {};
  expenses.forEach(function(e) {
    var d = new Date(e.date);
    var key = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    if (!meses[key]) meses[key] = { total:0, grupos:{necessidades:0,desejos:0,dividas:0,futuro:0,outros:0}, cats:{}, semanas:{1:0,2:0,3:0,4:0} };
    meses[key].total += e.amount;
    var grupo = getGrupo(e.category);
    meses[key].grupos[grupo] = (meses[key].grupos[grupo]||0) + e.amount;
    meses[key].cats[e.category] = (meses[key].cats[e.category]||0) + e.amount;
    var semana = Math.min(4, Math.ceil(d.getDate() / 7));
    meses[key].semanas[semana] = (meses[key].semanas[semana]||0) + e.amount;
  });

  var mesesKeys = Object.keys(meses).sort().slice(-3);
  var nMeses = mesesKeys.length || 1;

  // Médias
  var mediaGastos = mesesKeys.reduce(function(s,m){ return s+meses[m].total; },0) / nMeses;
  var mediaGrupos = { necessidades:0, desejos:0, dividas:0, futuro:0, outros:0 };
  Object.keys(mediaGrupos).forEach(function(g) {
    mediaGrupos[g] = mesesKeys.reduce(function(s,m){ return s+(meses[m].grupos[g]||0); },0) / nMeses;
  });

  // Padrão semanal
  var mediaSemanas = {1:0,2:0,3:0,4:0};
  mesesKeys.forEach(function(m) {
    Object.keys(mediaSemanas).forEach(function(s) {
      mediaSemanas[s] += (meses[m].semanas[s]||0) / nMeses;
    });
  });
  var semanaMax = Object.keys(mediaSemanas).sort(function(a,b){ return mediaSemanas[b]-mediaSemanas[a]; })[0];

  // Parcelas de dívidas
  var parcelasMes = debts.reduce(function(s,d){ return s+(d.installment||0); },0);

  // Distribuição atual em %
  var distAtual = {};
  if (mediaGastos > 0) {
    Object.keys(mediaGrupos).forEach(function(g) {
      distAtual[g] = Math.round((mediaGrupos[g]/mediaGastos)*100);
    });
  }

  return { rendaMensal, mediaGastos, mediaGrupos, distAtual, mediaSemanas, semanaMax, parcelasMes, nMeses, mesesKeys };
}

export default function PlanejamentoScreen({ state, styles, setScreen, savePlano }) {
  var ph=styles.ph, card=styles.card, btn=styles.btn, btnOut=styles.btnOut, input=styles.input, NavBar=styles.NavBar;
  var expenses = (state.expenses||[]).filter(function(e){ return !e.oculto; }), receitas = state.receitas||[], debts = state.debts||[], goals = state.goals||[];
  var plano = state.plano||null;

  const [etapa, setEtapa] = useState(plano ? "plano" : "analise");
  const [objetivo, setObjetivo] = useState((plano&&plano.objetivo)||"");
  const [dependentes, setDependentes] = useState((plano&&plano.dependentes!==undefined)?plano.dependentes:0);
  const [simCat, setSimCat] = useState("");
  const [simCorte, setSimCorte] = useState("");
  const [catDetalhe, setCatDetalhe] = useState(null);
  const [nPeriodos, setNPeriodos] = useState(3); // meses para média

  // ── Engine de análise ──────────────────────────────────
  var now = Date.now();
  var ms30 = 30*86400000, ms90 = 90*86400000;

  // Renda mensal real
  var rendaFixa = receitas.filter(function(r){ return r.recorrente; }).reduce(function(s,r){ return s+r.amount; },0);
  var rendaAvulsaMed = (function(){
    var avulsas = receitas.filter(function(r){ return !r.recorrente; });
    if (!avulsas.length) return 0;
    var meses = {};
    avulsas.forEach(function(r){ var d=new Date(r.date); var k=d.getFullYear()+"-"+d.getMonth(); meses[k]=(meses[k]||0)+r.amount; });
    var vals = Object.values(meses);
    return vals.reduce(function(s,v){ return s+v; },0) / vals.length;
  })();
  var rendaMensal = rendaFixa + rendaAvulsaMed || state.income || 0;

  // Gastos dos últimos 90 dias por categoria
  var exp90 = expenses.filter(function(e){ return now-e.date < ms90 && !e.oculto; });
  var exp30 = expenses.filter(function(e){ return now-e.date < ms30 && !e.oculto; });

  // Médias mensais por categoria
  var catMedia = {};
  CATEGORIES.forEach(function(cat){
    var total = exp90.filter(function(e){ return e.category===cat; }).reduce(function(s,e){ return s+e.amount; },0);
    catMedia[cat] = total/nPeriodos; // média configurável
  });

  // Agrupar categorias em grupos
  var grupos = {
    necessidades: ["Alimentação","Transporte","Moradia","Saúde","Impostos"],
    desejos: ["Lazer","Delivery","Assinaturas","Educação","Outros"],
    dividas: ["Cartão de Crédito"],
    trabalho: ["Trabalho"],
    investimentos: ["Investimentos","Transferências"],
  };

  var totalPorGrupo = {};
  Object.keys(grupos).forEach(function(g){
    totalPorGrupo[g] = grupos[g].reduce(function(s,cat){ return s+(catMedia[cat]||0); },0);
  });

  // Parcelas de dívidas
  var parcelasMes = debts.reduce(function(s,d){ return s+(d.installment||0); },0);
  totalPorGrupo.dividas = (totalPorGrupo.dividas||0) + parcelasMes;

  var totalGastos = Object.values(totalPorGrupo).reduce(function(s,v){ return s+v; },0);
  var sobraMes = rendaMensal - totalGastos;

  // Padrão semanal de gastos
  var semanas = [0,0,0,0]; // semanas 1,2,3,4 do mês
  exp90.forEach(function(e){
    var d = new Date(e.date);
    var semana = Math.min(3, Math.floor((d.getDate()-1)/7));
    semanas[semana] += e.amount/nPeriodos; // média configurável
  });
  var maxSemana = Math.max.apply(null, semanas)||1;
  var semMaior = semanas.indexOf(maxSemana);
  var nomeSemana = ["1ª semana","2ª semana","3ª semana","4ª semana"][semMaior];

  // Tendência mês a mês
  var exp60_30 = expenses.filter(function(e){ return now-e.date>=ms30 && now-e.date<2*ms30 && !e.oculto; });
  var total30 = exp30.reduce(function(s,e){ return s+e.amount; },0);
  var total60_30 = exp60_30.reduce(function(s,e){ return s+e.amount; },0);
  var tendencia = total60_30>0 ? ((total30-total60_30)/total60_30)*100 : 0;

  // Categoria que mais cresceu
  var catCresceu = null, maxCrescimento = 0;
  CATEGORIES.forEach(function(cat){
    var v30 = exp30.filter(function(e){ return e.category===cat; }).reduce(function(s,e){ return s+e.amount; },0);
    var v60 = exp60_30.filter(function(e){ return e.category===cat; }).reduce(function(s,e){ return s+e.amount; },0);
    if (v60>50 && v30>v60) { var c=(v30-v60)/v60*100; if(c>maxCrescimento){ maxCrescimento=c; catCresceu=cat; } }
  });

  // Dia do mês com mais gastos
  var porDia = {};
  exp90.forEach(function(e){ var d=new Date(e.date).getDate(); porDia[d]=(porDia[d]||0)+e.amount; });
  var diaMaiorGasto = Object.keys(porDia).sort(function(a,b){ return porDia[b]-porDia[a]; })[0]||null;

  // ── Gerador de plano personalizado ────────────────────
  function gerarPlano() {
    var temDivida = parcelasMes > 0 || debts.length > 0;
    var sobraReal = rendaMensal - totalGastos - parcelasMes;
    var pctSobra = rendaMensal > 0 ? sobraReal / rendaMensal : 0;
    var perfil = pctSobra >= 0.3 ? "folgado" : pctSobra >= 0.1 ? "equilibrado" : pctSobra >= 0 ? "apertado" : "negativo";
    var temDependentes = dependentes > 0;

    // Percentual de dívidas: 0 se não tem dívidas
    var divPct = temDivida ? (objetivo==="quitar" ? 30 : objetivo==="poupar" ? 10 : 15) : 0;
    var reservaPct = objetivo==="investir" ? 30 : objetivo==="poupar" ? 25 : objetivo==="quitar" ? 10 : 20;
    var desejosPct = objetivo==="quitar" ? 10 : (perfil==="negativo" ? 10 : perfil==="folgado" ? 20 : 15);
    var necessidadesPct = 100 - divPct - reservaPct - desejosPct;
    necessidadesPct = Math.max(40, Math.min(60, necessidadesPct));

    // Renormalizar para 100%
    var somaAnt = necessidadesPct + desejosPct + divPct + reservaPct;
    var f = 100 / somaAnt;
    var aloc = {
      necessidades: Math.round(necessidadesPct * f),
      desejos:      Math.round(desejosPct * f),
      reserva:      Math.round(reservaPct * f),
    };
    if (temDivida) aloc.dividas = Math.round(divPct * f);

    // Corrigir arredondamento
    var somaAloc = Object.values(aloc).reduce(function(s,v){ return s+v; }, 0);
    aloc.reserva += (100 - somaAloc);

    // Ajuste dependentes
    if (temDependentes) {
      aloc.necessidades = Math.min(60, aloc.necessidades + (dependentes >= 2 ? 7 : 4));
      aloc.desejos = Math.max(5, aloc.desejos - 3);
      aloc.reserva = Math.max(5, aloc.reserva - (dependentes >= 2 ? 4 : 1));
    }

    // Valores em R$
    var valores = {};
    Object.keys(aloc).forEach(function(k){ valores[k] = Math.round(rendaMensal * (aloc[k] / 100)); });

    // Dicas personalizadas
    var dicas = [];
    if (catCresceu) dicas.push(catCresceu + " cresceu " + Math.round(maxCrescimento) + "% — monitore de perto");
    if (semMaior === 3) dicas.push("Voce gasta mais no fim do mes — planeje pagamentos para o inicio");
    else if (semMaior === 0) dicas.push("Concentracao de gastos na 1a semana — distribua melhor ao longo do mes");
    if (sobraReal < 0) dicas.push("Gastos acima da renda — cortar desejos e prioridade imediata");
    if (temDivida && parcelasMes > rendaMensal * 0.35) dicas.push("Parcelas acima de 35% da renda — renegocie dividas se possivel");
    if (!temDivida) dicas.push("Sem dividas cadastradas — otimo momento para acelerar a reserva de emergencia e investimentos");
    if (pctSobra >= 0.3) dicas.push("Voce tem boa folga financeira — considere aumentar aportes em investimentos");
    if (pctSobra < 0 && pctSobra > -0.1) dicas.push("Deficit pequeno — identificar e cortar R$ " + fmtM2(Math.abs(sobraReal)) + " em desejos resolve");

    return {
      objetivo, dependentes, aloc, valores,
      geradoEm: Date.now(),
      rendaBase: rendaMensal,
      dicas, perfil, temDivida,
    };
  }

  // ── Simulador de cenários ─────────────────────────────
  var catMediaArr = CATEGORIES.map(function(cat){ return {cat,media:catMedia[cat]||0}; }).filter(function(c){ return c.media>0; }).sort(function(a,b){ return b.media-a.media; });
  var corteVal = parseFloat(simCorte)||0;
  var catSimMedia = catMediaArr.find(function(c){ return c.cat===simCat; });
  var economiaCorte = catSimMedia&&corteVal>0 ? Math.min(catSimMedia.media, catSimMedia.media*(corteVal/100)) : 0;
  var novasobra = sobraMes + economiaCorte;

  // Quanto tempo para quitar dívida mais cara com nova sobra
  var divMaisCara = debts.slice().sort(function(a,b){ return (b.rate||0)-(a.rate||0); })[0];
  var simResultDebts = divMaisCara&&economiaCorte>0 ? calcDebtSummary(divMaisCara, economiaCorte) : null;
  var simResultBase = divMaisCara ? calcDebtSummary(divMaisCara, 0) : null;
  var mesesEconomizados = simResultBase&&simResultDebts&&simResultBase.meses>simResultDebts.meses ? simResultBase.meses-simResultDebts.meses : 0;

  // Meta mais próxima
  var metaProx = goals.filter(function(g){ return g.saved<g.target; }).sort(function(a,b){ return (b.saved/b.target)-(a.saved/a.target); })[0];
  var mesesParaMeta = metaProx&&novasobra>0 ? Math.ceil((metaProx.target-metaProx.saved)/novasobra) : null;

  // ── Alertas preditivos ────────────────────────────────
  var alertasPred = [];
  if (semanas[3]>semanas[0]*1.3) alertasPred.push({icon:"📅",msg:"Voce costuma gastar 30%+ a mais no fim do mes. Configure um limite semanal."});
  if (catCresceu&&maxCrescimento>30) alertasPred.push({icon:"📈",msg:catCresceu+" esta subindo "+Math.round(maxCrescimento)+"% ao mes. Em 3 meses pode comprometer R$ "+fmtM(catMedia[catCresceu]*0.3)+" extras."});
  if (diaMaiorGasto&&parseInt(diaMaiorGasto)>20) alertasPred.push({icon:"🗓️",msg:"Dia "+diaMaiorGasto+" e seu pico de gastos. Evite compras impulsivas nessa data."});
  if (tendencia>20) alertasPred.push({icon:"⚠️",msg:"Seus gastos cresceram "+Math.round(tendencia)+"% esse mes. No ritmo atual, vai precisar de mais R$ "+fmtM((total30-total60_30))+" por mes."});
  if (rendaMensal>0&&sobraMes<rendaMensal*0.05) alertasPred.push({icon:"🔴",msg:"Sua sobra mensal e menor que 5% da renda. Qualquer imprevisto ja causa desequilibrio."});

  var perfilLabels = {negativo:"Atenção: Deficit", apertado:"Apertado", equilibrado:"Equilibrado", folgado:"Folgado"};
  var perfilCores = {negativo:"#EF4444", apertado:"#F59E0B", equilibrado:"#7B2FF2", folgado:"#16A34A"};
  var objetivoOpts = [
    {v:"quitar", l:"Quitar dívidas", d:"Prioridade máxima: eliminar dívidas", icon:"🎯"},
    {v:"poupar", l:"Reserva/Investir", d:"Construir emergência de 6 meses", icon:"🛡️"},
    {v:"investir", l:"Investir", d:"Fazer dinheiro trabalhar por você", icon:"📈"},
    {v:"equilibrar", l:"Equilibrar", d:"Viver bem sem apertar", icon:"⚖️"},
  ];

  // Renderização
  if (rendaMensal===0) return (
    <div style={{background:"#F2F0F8",minHeight:"100vh"}}>
      <div style={ph}><div style={{fontSize:13,opacity:0.7,fontWeight:500}}>Planejamento</div><div style={{fontSize:26,fontWeight:700,letterSpacing:-0.5}}>Plano financeiro</div></div>
      <div style={{padding:24,textAlign:"center"}}>
        
        <div style={{fontSize:16,fontWeight:700,color:"#333",marginBottom:8}}>Cadastre suas receitas primeiro</div>
        <div style={{fontSize:13,color:"#999",marginBottom:24,lineHeight:1.6}}>Para gerar um plano personalizado, preciso saber sua renda. Cadastre pelo menos uma receita recorrente.</div>
        <button style={{...btn,maxWidth:240,margin:"0 auto"}} onClick={function(){ setScreen("receitas"); }}>Cadastrar receitas</button>
      </div>
      <div style={{height:20}}/><NavBar/>
    </div>
  );

  return (
    <div style={{background:"#F2F0F8",minHeight:"100vh"}}>
      <div style={ph}>
        <div style={{fontSize:13,opacity:0.7,fontWeight:500}}>Planejamento Financeiro</div>
        <div style={{fontSize:24,fontWeight:700,letterSpacing:-0.5}}>Plano personalizado</div>
        <div style={{fontSize:12,opacity:0.65,marginTop:2}}>Baseado nos seus dados reais</div>
      </div>
      <div style={{padding:16}}>

        {/* Etapa 1: Análise automática */}
        {etapa==="analise" && (
          <div>
            <div style={{...card,background:"linear-gradient(135deg,#EDE9FE,#DDD6FE)",border:"none",marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:"#7B2FF2",letterSpacing:0.5,marginBottom:12}}>SEU PERFIL FINANCEIRO ATUAL</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div style={{background:"rgba(255,255,255,0.7)",borderRadius:12,padding:12,textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#BBB",fontWeight:600}}>RENDA MENSAL</div>
                  <div style={{fontSize:18,fontWeight:700,color:"#7B2FF2",marginTop:4}}>R$ {fmtM2(rendaMensal)}</div>
                </div>
                <div style={{background:"rgba(255,255,255,0.7)",borderRadius:12,padding:12,textAlign:"center"}}>
                  <div style={{fontSize:10,color:"#BBB",fontWeight:600}}>SOBRA ATUAL</div>
                  <div style={{fontSize:18,fontWeight:700,color:sobraMes<0?"#EF4444":"#16A34A",marginTop:4}}>R$ {fmtM2(sobraMes)}</div>
                </div>
              </div>
              {/* Distribuição atual */}
              <div style={{fontSize:11,fontWeight:700,color:"#7B2FF2",letterSpacing:0.5,marginBottom:8}}>COMO VOCE DISTRIBUI HOJE</div>
              {Object.keys(totalPorGrupo).map(function(g){
                if (!totalPorGrupo[g]) return null;
                var pct = rendaMensal>0 ? Math.round((totalPorGrupo[g]/rendaMensal)*100) : 0;
                var labels={necessidades:"Necessidades",desejos:"Desejos",dividas:"Dívidas",trabalho:"Trabalho",investimentos:"Investimentos"};
                var cores={necessidades:"#7B2FF2",desejos:"#F59E0B",dividas:"#EF4444",trabalho:"#3B82F6",investimentos:"#16A34A"};
                return (
                  <div key={g} onClick={function(){ setCatDetalhe(g); }} style={{marginBottom:8,cursor:"pointer",borderRadius:10,padding:"6px 8px",background:catDetalhe===g?"rgba(255,255,255,0.4)":"transparent",transition:"background 0.2s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:12,fontWeight:600,color:"#333"}}>{labels[g]||g} <span style={{fontSize:10,color:"#9B8EBE"}}>↗</span></span>
                      <span style={{fontSize:12,fontWeight:700,color:cores[g]||"#333"}}>{pct}% · R$ {fmtM2(totalPorGrupo[g])}</span>
                    </div>
                    <div style={{background:"rgba(255,255,255,0.5)",borderRadius:6,height:8}}>
                      <div style={{background:cores[g]||"#7B2FF2",borderRadius:6,height:"100%",width:Math.min(100,pct)+"%",transition:"width 0.5s"}}/>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Alertas preditivos */}
            {alertasPred.length>0 && (
              <div style={card}>
                <div style={{fontSize:11,fontWeight:700,color:"#9B8EBE",letterSpacing:0.5,marginBottom:12}}>PADROES IDENTIFICADOS</div>
                {alertasPred.map(function(a,i){ return (
                  <div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:i<alertasPred.length-1?"1px solid #F5F5F5":"none"}}>
                    <span style={{fontSize:18,flexShrink:0}}>{a.icon}</span>
                    <span style={{fontSize:13,color:"#555",lineHeight:1.5}}>{a.msg}</span>
                  </div>
                ); })}
              </div>
            )}

            {/* Padrão semanal */}
            {exp90.length>5 && (
              <div style={card}>
                <div style={{fontSize:11,fontWeight:700,color:"#9B8EBE",letterSpacing:0.5,marginBottom:16}}>PADRAO SEMANAL DE GASTOS</div>
                <div style={{display:"flex",alignItems:"flex-end",gap:8,height:90,marginBottom:8}}>
                  {semanas.map(function(v,i){
                    var h=Math.max(8,(v/maxSemana)*70);
                    return (
                      <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                        <span style={{fontSize:9,color:i===semMaior?"#7B2FF2":"#999",fontWeight:600,whiteSpace:"nowrap",marginBottom:2}}>
                          R${v>=1000?(v/1000).toFixed(1)+"k":Math.round(v)}
                        </span>
                        <div style={{width:"100%",height:h,borderRadius:8,background:i===semMaior?"linear-gradient(180deg,#9B5FF7,#7B2FF2)":"#DDD6FE",transition:"height 0.4s"}}/>
                      </div>
                    );
                  })}
                </div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  {semanas.map(function(v,i){
                    return (
                      <div key={i} style={{flex:1,textAlign:"center"}}>
                        <span style={{fontSize:10,color:i===semMaior?"#7B2FF2":"#BBB",fontWeight:i===semMaior?700:400}}>S{i+1}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{fontSize:12,color:"#666",textAlign:"center"}}>Pico de gastos na <strong>{nomeSemana}</strong></div>
              </div>
            )}

            {/* Detalhe de categoria clicada */}
            {catDetalhe && (function(){
              var cats = Object.keys(CAT_GRUPO_MAP).filter(function(c){ return CAT_GRUPO_MAP[c]===catDetalhe; });
              var itens = exp30.filter(function(e){ return cats.includes(e.category)||e.category===catDetalhe; });
              var total = itens.reduce(function(s,e){ return s+e.amount; },0);
              if (itens.length===0) return null;
              var labels={necessidades:"Necessidades",desejos:"Desejos",dividas:"Dívidas/Parcelas",trabalho:"Trabalho",investimentos:"Investimentos"};
              return (
                <div style={{...card,border:"2px solid #7B2FF2",marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#7B2FF2"}}>{labels[catDetalhe]||catDetalhe} — últimos 30 dias</div>
                    <button onClick={function(){ setCatDetalhe(null); }} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#BBB"}}>✕</button>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:"#333",marginBottom:10}}>Total: R$ {fmtM2(total)}</div>
                  {itens.sort(function(a,b){ return b.amount-a.amount; }).slice(0,10).map(function(e,i){
                    return (
                      <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #F5F5F5"}}>
                        <div>
                          <div style={{fontSize:13,color:"#333",fontWeight:500}}>{e.name}</div>
                          <div style={{fontSize:11,color:"#BBB"}}>{e.category} · {new Date(e.date).toLocaleDateString("pt-BR")}</div>
                        </div>
                        <span style={{fontSize:13,fontWeight:700,color:"#7B2FF2"}}>R$ {fmtM2(e.amount)}</span>
                      </div>
                    );
                  })}
                  {itens.length>10&&<div style={{fontSize:12,color:"#BBB",marginTop:8,textAlign:"center"}}>+{itens.length-10} lançamentos</div>}
                </div>
              );
            })()}

            {/* Seletor de período para a média */}
            <div style={{...card,marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"#9B8EBE",marginBottom:10,letterSpacing:0.5}}>BASE DE CALCULO DA MEDIA</div>
              <div style={{fontSize:13,color:"#666",marginBottom:10}}>Quantos meses usar para calcular a media de gastos?</div>
              <div style={{display:"flex",gap:6}}>
                {[1,2,3,6].map(function(n){ return (
                  <button key={n} onClick={function(){ setNPeriodos(n); }}
                    style={{flex:1,padding:"10px 4px",borderRadius:12,border:nPeriodos===n?"2px solid #7B2FF2":"1.5px solid #E5E5E5",background:nPeriodos===n?"#EDE9FE":"#fff",color:nPeriodos===n?"#7B2FF2":"#666",fontSize:13,cursor:"pointer",fontWeight:nPeriodos===n?700:400}}>
                    {n} {n===1?"mês":"meses"}
                  </button>
                ); })}
              </div>
              <div style={{fontSize:11,color:"#BBB",marginTop:8}}>Mais meses = media mais estavel. Menos meses = reflete gastos recentes.</div>
            </div>

            <button style={{...btn,marginTop:4}} onClick={function(){ setEtapa("perguntas"); }}>
              Gerar meu plano personalizado →
            </button>
          </div>
        )}

        {/* Etapa 2: Perguntas de refinamento */}
        {etapa==="perguntas" && (
          <div>
            <div style={card}>
              <div style={{fontSize:16,fontWeight:700,color:"#333",marginBottom:6}}>Qual e seu principal objetivo agora?</div>
              <div style={{fontSize:13,color:"#999",marginBottom:16}}>Isso define como vou distribuir sua renda no plano.</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
                {objetivoOpts.map(function(o){ return (
                  <div key={o.v} onClick={function(){ setObjetivo(o.v); }}
                    style={{padding:14,borderRadius:16,border:objetivo===o.v?"2px solid #7B2FF2":"1.5px solid #E5E5E5",background:objetivo===o.v?"linear-gradient(135deg,#EDE9FE,#DDD6FE)":"#fff",cursor:"pointer",textAlign:"center"}}>
                    <div style={{fontSize:24,marginBottom:6}}>{o.icon}</div>
                    <div style={{fontSize:13,fontWeight:700,color:objetivo===o.v?"#7B2FF2":"#333"}}>{o.l}</div>
                    <div style={{fontSize:11,color:"#999",marginTop:3,lineHeight:1.4}}>{o.d}</div>
                  </div>
                ); })}
              </div>
              <div style={{fontSize:16,fontWeight:700,color:"#333",marginBottom:6}}>Voce tem dependentes financeiros?</div>
              <div style={{fontSize:13,color:"#999",marginBottom:12}}>Filhos, pais, conjuge que dependem da sua renda.</div>
              <div style={{display:"flex",gap:8,marginBottom:20}}>
                {[0,1,2,3].map(function(n){ return (
                  <button key={n} onClick={function(){ setDependentes(n); }}
                    style={{flex:1,padding:"12px 4px",borderRadius:12,border:dependentes===n?"2px solid #7B2FF2":"1.5px solid #E5E5E5",background:dependentes===n?"#EDE9FE":"#fff",color:dependentes===n?"#7B2FF2":"#666",fontSize:13,fontWeight:dependentes===n?700:400,cursor:"pointer"}}>
                    {n===0?"Nenhum":n===3?"3+":n}
                  </button>
                ); })}
              </div>
              <div style={{display:"flex",gap:8}}>
                <button style={{...btnOut,flex:1}} onClick={function(){ setEtapa("analise"); }}>Voltar</button>
                <button style={{...btn,flex:1,opacity:!objetivo?0.5:1}} disabled={!objetivo}
                  onClick={function(){
                    if(!objetivo) return;
                    var p = gerarPlano();
                    savePlano(p);
                    setEtapa("plano");
                  }}>Gerar plano</button>
              </div>
            </div>
          </div>
        )}

        {/* Etapa 3: Plano gerado */}
        {etapa==="plano" && plano && (
          <div>
            {/* Header do plano */}
            <div style={{...card,background:"linear-gradient(135deg,#6B21E8,#9B5FF7)",border:"none",color:"#fff",marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <div>
                  <div style={{fontSize:11,opacity:0.75,fontWeight:600,letterSpacing:0.5}}>SEU PERFIL</div>
                  <div style={{fontSize:20,fontWeight:800}}>{perfilLabels[plano.perfil]||"Personalizado"}</div>
                </div>
                <div style={{fontSize:36}}>
                  {plano.perfil==="folgado"?"😎":plano.perfil==="equilibrado"?"🎯":plano.perfil==="apertado"?"💪":"⚠️"}
                </div>
              </div>
              <div style={{background:"rgba(255,255,255,0.15)",borderRadius:12,padding:12}}>
                <div style={{fontSize:11,opacity:0.8,marginBottom:6,fontWeight:600}}>OBJETIVO: {objetivoOpts.find(function(o){ return o.v===plano.objetivo; })?.l||plano.objetivo}</div>
                <div style={{fontSize:12,opacity:0.85,lineHeight:1.5}}>
                  {plano.perfil==="negativo"?"Gastos acima da renda. Prioridade: cortar desejos e reorganizar o orcamento.":
                   plano.perfil==="apertado"?"Sobra pequena. Pequenos cortes em desejos criam espaco para respirar.":
                   plano.perfil==="equilibrado"?"Voce esta bem posicionado. Hora de acelerar metas e reserva.":
                   "Voce tem folga! Maximize investimentos e construa patrimonio."}
                </div>
              </div>
            </div>

            {/* Distribuição ideal */}
            <div style={card}>
              <div style={{fontSize:11,fontWeight:700,color:"#9B8EBE",letterSpacing:0.5,marginBottom:14}}>DISTRIBUICAO IDEAL DA SUA RENDA</div>
              <div style={{fontSize:12,color:"#999",marginBottom:14}}>Base: R$ {fmtM2(plano.rendaBase)}/mes</div>
              {[
                {k:"necessidades",l:"Necessidades",icon:"🏠",cor:"#7B2FF2",desc:"Moradia, alimentacao, saude, transporte"},
                {k:"desejos",l:"Desejos",icon:"🎉",cor:"#F59E0B",desc:"Lazer, delivery, assinaturas, roupas"},
                {k:"dividas",l:"Quitacao dividas",icon:"💳",cor:"#EF4444",desc:"Parcelas e quitacao antecipada"},
                {k:"reserva",l:"Poupanca/Invest.",icon:"📈",cor:"#16A34A",desc:"Reserva de emergencia e investimentos"},
              ].filter(function(item){ return (plano.aloc[item.k]||0) > 0; }).map(function(item){
                var pct = plano.aloc[item.k]||0;
                var val = plano.valores[item.k]||0;
                var atual = totalPorGrupo[item.k===item.k?"dividas"===item.k?"dividas":item.k:item.k]||0;
                var diff = val - (item.k==="reserva"?sobraMes:totalPorGrupo[item.k]||0);
                return (
                  <div key={item.k} onClick={function(){ setCatDetalhe(item.k); }} style={{marginBottom:16,padding:"14px",borderRadius:14,background:catDetalhe===item.k?"#EDE9FE":"#F8F8F8",border:catDetalhe===item.k?"1.5px solid #7B2FF2":"1px solid #F0F0F0",cursor:"pointer",transition:"all 0.2s"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                      <span style={{fontSize:20}}>{item.icon}</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:14,fontWeight:700,color:"#333"}}>{item.l}</div>
                        <div style={{fontSize:11,color:"#999"}}>{item.desc}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:16,fontWeight:800,color:item.cor}}>{pct}%</div>
                        <div style={{fontSize:12,fontWeight:600,color:"#555"}}>R$ {fmtM2(val)}</div>
                      </div>
                    </div>
                    <div style={{background:"#E5E5E5",borderRadius:6,height:8}}>
                      <div style={{background:item.cor,borderRadius:6,height:"100%",width:pct+"%",transition:"width 0.6s"}}/>
                    </div>
                    {Math.abs(diff)>50 && (
                      <div style={{marginTop:6,fontSize:11,color:diff>0?"#16A34A":"#EF4444",fontWeight:600}}>
                        {diff>0?"↑ Aumentar R$ "+fmtM(diff):"↓ Reduzir R$ "+fmtM(Math.abs(diff))} em relacao ao atual
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Detalhe de categoria no plano */}
            {catDetalhe && (function(){
              var cats = Object.keys(CAT_GRUPO_MAP).filter(function(c){ return CAT_GRUPO_MAP[c]===catDetalhe; });
              var itens = exp30.filter(function(e){ return cats.includes(e.category); });
              var total = itens.reduce(function(s,e){ return s+e.amount; },0);
              var labels={necessidades:"Necessidades",desejos:"Desejos",dividas:"Dívidas/Parcelas",trabalho:"Trabalho",investimentos:"Investimentos",reserva:"Poupança/Invest."};
              return itens.length>0 ? (
                <div style={{...card,border:"2px solid #7B2FF2",marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{fontSize:14,fontWeight:700,color:"#7B2FF2"}}>{labels[catDetalhe]||catDetalhe} — últimos 30 dias</div>
                    <button onClick={function(){ setCatDetalhe(null); }} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#BBB"}}>✕</button>
                  </div>
                  <div style={{fontSize:13,fontWeight:700,color:"#333",marginBottom:10}}>Total: R$ {fmtM2(total)}</div>
                  {itens.sort(function(a,b){ return b.amount-a.amount; }).slice(0,10).map(function(e){
                    return (
                      <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid #F5F5F5"}}>
                        <div>
                          <div style={{fontSize:13,color:"#333",fontWeight:500}}>{e.name}</div>
                          <div style={{fontSize:11,color:"#BBB"}}>{e.category} · {new Date(e.date).toLocaleDateString("pt-BR")}</div>
                        </div>
                        <span style={{fontSize:13,fontWeight:700,color:"#7B2FF2"}}>R$ {fmtM2(e.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null;
            })()}

            {/* Dicas personalizadas */}
            {plano.dicas&&plano.dicas.length>0 && (
              <div style={card}>
                <div style={{fontSize:11,fontWeight:700,color:"#9B8EBE",letterSpacing:0.5,marginBottom:12}}>DICAS PARA O SEU PERFIL</div>
                {plano.dicas.map(function(d,i){ return (
                  <div key={i} style={{display:"flex",gap:10,padding:"10px 0",borderBottom:i<plano.dicas.length-1?"1px solid #F5F5F5":"none"}}>
                    <span style={{fontSize:16,flexShrink:0}}>💡</span>
                    <span style={{fontSize:13,color:"#555",lineHeight:1.5}}>{d}</span>
                  </div>
                ); })}
              </div>
            )}

            {/* Simulador de cenários */}
            <div style={card}>
              <div style={{fontSize:11,fontWeight:700,color:"#9B8EBE",letterSpacing:0.5,marginBottom:4}}>SIMULADOR DE CENARIOS</div>
              <div style={{fontSize:13,color:"#999",marginBottom:14}}>E se eu cortar uma categoria?</div>
              <div style={{marginBottom:10}}>
                <div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:6}}>Categoria a cortar:</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {catMediaArr.slice(0,6).map(function(c){ return (
                    <button key={c.cat} onClick={function(){ setSimCat(c.cat); }}
                      style={{padding:"6px 12px",borderRadius:20,border:simCat===c.cat?"1.5px solid #7B2FF2":"1.5px solid #E5E5E5",background:simCat===c.cat?"#EDE9FE":"#fff",color:simCat===c.cat?"#7B2FF2":"#666",fontSize:11,cursor:"pointer",fontWeight:simCat===c.cat?700:400}}>
                      {c.cat} (R$ {fmtM(c.media)})
                    </button>
                  ); })}
                </div>
              </div>
              {simCat && (
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:600,color:"#666",marginBottom:8}}>Cortar quanto? (% de R$ {fmtM(catSimMedia?.media||0)})</div>
                  <div style={{display:"flex",gap:6,marginBottom:10}}>
                    {[20,30,50,100].map(function(p){ return (
                      <button key={p} onClick={function(){ setSimCorte(String(p)); }}
                        style={{flex:1,padding:"8px 4px",borderRadius:10,border:simCorte==p?"2px solid #7B2FF2":"1.5px solid #E5E5E5",background:simCorte==p?"#EDE9FE":"#fff",color:simCorte==p?"#7B2FF2":"#666",fontSize:12,cursor:"pointer",fontWeight:simCorte==p?700:400}}>
                        {p}%
                      </button>
                    ); })}
                  </div>
                </div>
              )}
              {economiaCorte>0 && (
                <div style={{background:"linear-gradient(135deg,#F0FDF4,#DCFCE7)",borderRadius:14,padding:14}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                    <div style={{textAlign:"center",background:"rgba(255,255,255,0.7)",borderRadius:10,padding:10}}>
                      <div style={{fontSize:10,color:"#BBB",fontWeight:600}}>ECONOMIA/MES</div>
                      <div style={{fontSize:18,fontWeight:700,color:"#16A34A",marginTop:4}}>R$ {fmtM2(economiaCorte)}</div>
                    </div>
                    <div style={{textAlign:"center",background:"rgba(255,255,255,0.7)",borderRadius:10,padding:10}}>
                      <div style={{fontSize:10,color:"#BBB",fontWeight:600}}>NOVA SOBRA</div>
                      <div style={{fontSize:18,fontWeight:700,color:novasobra>0?"#16A34A":"#EF4444",marginTop:4}}>R$ {fmtM2(novasobra)}</div>
                    </div>
                  </div>
                  {mesesEconomizados>0 && (
                    <div style={{background:"rgba(255,255,255,0.8)",borderRadius:10,padding:10,marginBottom:8,textAlign:"center"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#16A34A"}}>
                        Quita {divMaisCara?.name||"divida"} {mesesEconomizados} meses antes
                      </div>
                      <div style={{fontSize:11,color:"#555",marginTop:2}}>Economizando R$ {fmtM2(simResultDebts?.economia||0)} em juros</div>
                    </div>
                  )}
                  {metaProx&&mesesParaMeta&&(
                    <div style={{background:"rgba(255,255,255,0.8)",borderRadius:10,padding:10,textAlign:"center"}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#7B2FF2"}}>Meta "{metaProx.name}" em {mesesParaMeta} {mesesParaMeta===1?"mes":"meses"}</div>
                      <div style={{fontSize:11,color:"#555",marginTop:2}}>Usando a economia mensal para a meta</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button style={{...btnOut,marginBottom:12}} onClick={function(){ setEtapa("perguntas"); }}>
              Refazer plano
            </button>
          </div>
        )}
      </div>
      <div style={{height:20}}/><NavBar/>
    </div>
  );
}