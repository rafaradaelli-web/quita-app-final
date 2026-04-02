
import LESSONS from '../services/lessons.json'

export default function TrilhaScreen({ state, styles, startLesson, NavBar }) {
  var ph=styles.ph, card=styles.card;

  var completedIds = state.completedLessons || [];
  var totalLessons = LESSONS.length;
  var completedCount = completedIds.length;
  var allDone = completedCount === totalLessons;

  // Dados visuais de cada lição
  var lessonMeta = [
    { icon:"💳", label:"Raio-X", color:"#EF4444", bgDone:"#FEF2F2", coin:"🔴", stage:"endividado" },
    { icon:"📈", label:"Juros",  color:"#F97316", bgDone:"#FFF7ED", coin:"🟠", stage:"endividado" },
    { icon:"⛄", label:"Bola de neve", color:"#F59E0B", bgDone:"#FFFBEB", coin:"🟡", stage:"crescendo" },
    { icon:"🔍", label:"Gastos",  color:"#7B2FF2", bgDone:"#F5F3FF", coin:"🟣", stage:"crescendo" },
    { icon:"⚖️", label:"Equilíbrio", color:"#16A34A", bgDone:"#F0FDF4", coin:"🟢", stage:"livre" },
  ];

  // Posições em zigue-zague (x em %, y é sequencial)
  var zigzag = [
    { x: 50 }, // centro
    { x: 25 }, // esquerda
    { x: 65 }, // direita
    { x: 30 }, // esquerda
    { x: 55 }, // direita
  ];

  // Ícones decorativos do cenário financeiro
  var decorations = [
    { x:"78%", y:140, emoji:"💸", size:18, opacity:0.35 },
    { x:"8%",  y:200, emoji:"📋", size:16, opacity:0.3 },
    { x:"85%", y:310, emoji:"⚠️", size:16, opacity:0.3 },
    { x:"5%",  y:370, emoji:"🏦", size:18, opacity:0.35 },
    { x:"80%", y:480, emoji:"💡", size:16, opacity:0.3 },
    { x:"10%", y:540, emoji:"📊", size:18, opacity:0.35 },
    { x:"75%", y:640, emoji:"🎯", size:18, opacity:0.35 },
    { x:"8%",  y:700, emoji:"⭐", size:16, opacity:0.3 },
  ];

  var NODE_SIZE = 72;
  var ROW_H = 160;
  var TOTAL_H = totalLessons * ROW_H + 120;

  // Gerar pontos da linha conectora entre nós
  function nodeCenter(i) {
    var xPct = zigzag[i] ? zigzag[i].x : 50;
    var x = xPct / 100;
    var y = 80 + i * ROW_H + NODE_SIZE / 2;
    return { x, y };
  }

  return (
    <div style={{background:"transparent", minHeight:"100vh"}}>
      {/* Header */}
      <div style={ph}>
        <div style={{fontSize:13,opacity:0.7,fontWeight:500}}>Sua jornada</div>
        <div style={{fontSize:26,fontWeight:700,letterSpacing:-0.5}}>Trilha Financeira</div>
        <div style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
          <span style={{background:"rgba(255,255,255,0.18)",borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:600}}>
            🔥 {state.streak} {state.streak===1?"dia":"dias"}
          </span>
          <span style={{background:"rgba(255,255,255,0.18)",borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:600}}>
            ⚡ {state.xp.toLocaleString()} XP
          </span>
          <span style={{marginLeft:"auto",background:"rgba(255,255,255,0.18)",borderRadius:20,padding:"5px 12px",fontSize:12,fontWeight:600}}>
            {completedCount}/{totalLessons} lições
          </span>
        </div>
      </div>

      {/* Trilha */}
      <div style={{position:"relative",width:"100%",height:TOTAL_H,overflowX:"hidden"}}>

        {/* Decorações de fundo */}
        {decorations.map(function(d,i){
          return (
            <div key={i} style={{position:"absolute",left:d.x,top:d.y,fontSize:d.size,opacity:d.opacity,pointerEvents:"none",userSelect:"none"}}>
              {d.emoji}
            </div>
          );
        })}

        {/* Linha conectora entre nós */}
        <svg style={{position:"absolute",top:0,left:0,width:"100%",height:TOTAL_H,pointerEvents:"none"}} viewBox={"0 0 100 "+TOTAL_H} preserveAspectRatio="none">
          {LESSONS.map(function(l,i){
            if (i >= LESSONS.length-1) return null;
            var a = nodeCenter(i);
            var b = nodeCenter(i+1);
            var done = completedIds.includes(l.id);
            return (
              <line key={i}
                x1={a.x*100+"%"} y1={a.y}
                x2={b.x*100+"%"} y2={b.y}
                stroke={done?"#A855F7":"#DDD6FE"}
                strokeWidth="3"
                strokeDasharray={done?"none":"8 6"}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Nós das lições */}
        {LESSONS.map(function(l,i){
          var meta = lessonMeta[i] || lessonMeta[0];
          var done = completedIds.includes(l.id);
          var isCurrent = !done && i === completedCount;
          var locked = !done && !isCurrent;
          var pos = zigzag[i] || {x:50};
          var xPct = pos.x;
          var y = 80 + i * ROW_H;

          // Card label: à esquerda ou direita dependendo da posição
          var labelRight = xPct < 50;

          return (
            <div key={l.id}>
              {/* Label da lição */}
              <div style={{
                position:"absolute",
                top: y + NODE_SIZE/2 - 22,
                left: labelRight ? (xPct/100*100+"%") : "auto",
                right: !labelRight ? ((100-xPct)/100*100+"%") : "auto",
                marginLeft: labelRight ? (NODE_SIZE+8)+"px" : 0,
                marginRight: !labelRight ? (NODE_SIZE+8)+"px" : 0,
                maxWidth: 100,
                textAlign: labelRight ? "left" : "right",
                pointerEvents:"none",
              }}>
                <div style={{fontSize:12,fontWeight:700,color:done?"#7B2FF2":isCurrent?"#6B21E8":"#BBB",lineHeight:1.2}}>{l.title}</div>
                <div style={{fontSize:10,color:done?"#16A34A":isCurrent?"#9B5FF7":"#CCC",fontWeight:600,marginTop:2}}>
                  {done?"✓ +"+l.xp+" XP":isCurrent?"▶ +"+l.xp+" XP":"🔒"}
                </div>
              </div>

              {/* Nó principal */}
              <div
                onClick={function(){ if(!locked) startLesson(i); }}
                style={{
                  position:"absolute",
                  left:"calc("+xPct+"% - "+(NODE_SIZE/2)+"px)",
                  top: y,
                  width: NODE_SIZE,
                  height: NODE_SIZE,
                  borderRadius:"50%",
                  cursor: locked?"default":"pointer",
                  transition:"transform 0.15s",
                  // Camadas do nó
                  background: done
                    ? "linear-gradient(145deg,#A855F7,#7B2FF2)"
                    : isCurrent
                    ? "linear-gradient(145deg,#6B21E8,#7B2FF2)"
                    : "#E5E3F0",
                  boxShadow: done
                    ? "0 4px 0 #6B21E8, 0 6px 16px rgba(107,33,232,0.35)"
                    : isCurrent
                    ? "0 4px 0 #4C1D95, 0 8px 20px rgba(107,33,232,0.5)"
                    : "0 3px 0 #C4C0D8",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  flexDirection:"column",
                  gap:2,
                  border: isCurrent ? "3px solid #fff" : "none",
                  outline: isCurrent ? "3px solid #7B2FF2" : "none",
                  outlineOffset: 2,
                }}
              >
                {done ? (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : locked ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="11" width="14" height="10" rx="2" fill="#C4C0D8"/>
                    <path d="M8 11V7a4 4 0 018 0v4" stroke="#C4C0D8" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <div>
                    <div style={{fontSize:24}}>{meta.icon}</div>
                  </div>
                )}
                {isCurrent && (
                  <div style={{
                    position:"absolute",
                    top:-36,
                    left:"50%",
                    transform:"translateX(-50%)",
                    background:"linear-gradient(135deg,#6B21E8,#7B2FF2)",
                    color:"#fff",
                    fontSize:11,
                    fontWeight:700,
                    padding:"4px 10px",
                    borderRadius:20,
                    whiteSpace:"nowrap",
                    boxShadow:"0 2px 8px rgba(107,33,232,0.35)",
                    letterSpacing:0.3,
                  }}>
                    COMEÇAR
                    <div style={{position:"absolute",bottom:-5,left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"5px solid transparent",borderRight:"5px solid transparent",borderTop:"5px solid #7B2FF2"}}/>
                  </div>
                )}
              </div>

              {/* Medalha de XP nos completos */}
              {done && (
                <div style={{
                  position:"absolute",
                  left:"calc("+xPct+"% + "+(NODE_SIZE/2-10)+"px)",
                  top: y + NODE_SIZE - 16,
                  background:"#F59E0B",
                  color:"#fff",
                  fontSize:9,
                  fontWeight:700,
                  padding:"2px 6px",
                  borderRadius:10,
                  boxShadow:"0 2px 6px rgba(245,158,11,0.4)",
                  border:"1.5px solid #fff",
                }}>⭐ {l.xp}</div>
              )}
            </div>
          );
        })}

        {/* Marco de conclusão */}
        {allDone && (
          <div style={{
            position:"absolute",
            left:"50%",
            transform:"translateX(-50%)",
            top: 80 + totalLessons * ROW_H - 40,
            textAlign:"center",
          }}>
            <div style={{fontSize:40}}>🏆</div>
            <div style={{fontSize:13,fontWeight:700,color:"#7B2FF2",marginTop:4}}>Trilha completa!</div>
          </div>
        )}

        {/* Porquinha no ponto atual */}
        {(function(){
          var currentNodeIdx = Math.min(completedCount, totalLessons-1);
          var pos = zigzag[currentNodeIdx] || {x:50};
          var xPct = pos.x;
          var y = 80 + currentNodeIdx * ROW_H;
          var pigX = xPct < 50
            ? "calc("+xPct+"% - "+(NODE_SIZE+36)+"px)"
            : "calc("+xPct+"% + "+(NODE_SIZE+4)+"px)";
          return (
            <div style={{
              position:"absolute",
              left: pigX,
              top: y + NODE_SIZE/2 - 28,
              width:52, height:52,
              display:"flex",alignItems:"center",justifyContent:"center",
            }}>
              <div style={{width:52,height:52}}/>
            </div>
          );
        })()}

      </div>

      {/* Footer padding */}
      <div style={{height:20}}/><NavBar/>
    </div>
  );
}