const $=id=>document.getElementById(id);
const canvas=$("reactor"),ctx=canvas.getContext("2d",{alpha:true}),nodesEl=$("nodes");
let W=0,H=0,dpr=1,energy=100,level=1,score=0,combo=1,target=0,sequence=[],nodeEls=[];
let timeLeft=0,paused=false,running=false,last=0,particles=[],autoMode=false,autoToken=0,difficulty="normal";
let best=Number(localStorage.getItem("neonCoreBest")||0);
const colors=["#56f6ff","#ff4fd8","#b9ff5c","#a78bfa","#ffbd59"];
const settings={normal:{time:2.8,loss:8,wrong:12,auto:150},hard:{time:2.25,loss:10,wrong:14,auto:100},pro:{time:1.8,loss:13,wrong:17,auto:65}};

$("best").textContent=best;
function resize(){
  const rect=canvas.getBoundingClientRect(); W=rect.width; H=rect.height; dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener("resize",resize,{passive:true});resize();

document.querySelectorAll(".diff").forEach(btn=>btn.onclick=()=>{
  if(running)return;
  difficulty=btn.dataset.diff;
  document.querySelectorAll(".diff").forEach(x=>x.classList.toggle("active",x===btn));
});

function makeSequence(){
  const count=Math.min(3+Math.floor((level-1)/2),7);
  sequence=Array.from({length:count},(_,i)=>i+1);
  for(let i=count-1;i>0;i--){const j=(Math.random()*(i+1))|0;[sequence[i],sequence[j]]=[sequence[j],sequence[i]]}
  target=0;
  $("sequenceText").textContent=sequence.join(" → ");
  $("target").textContent="NODO "+sequence[target];
  timeLeft=Math.max(settings[difficulty].time-level*.075,1.0);
  createNodes(count);
}
function createNodes(count){
  nodesEl.innerHTML="";nodeEls=[];
  const r=Math.min(39,27+count*1.7);
  for(let i=1;i<=count;i++){
    const a=(i/count)*Math.PI*2-Math.PI/2;
    const el=document.createElement("button");
    el.className="node";el.textContent=i;el.dataset.id=i;el.type="button";
    el.setAttribute("aria-label","Nodo "+i);
    el.style.left=(50+Math.cos(a)*r)+"%";el.style.top=(50+Math.sin(a)*r)+"%";
    el.addEventListener("pointerdown",e=>{e.preventDefault();hit(i,el)}, {passive:false});
    nodesEl.appendChild(el);nodeEls.push(el);
  }
}
function hit(n,el){
  if(!running||paused)return;
  if(n===sequence[target]){
    el.classList.add("done");burst(el);target++;
    score+=100*combo;combo=Math.min(combo+1,12);
    if(target>=sequence.length){
      level++;score+=level*250;energy=Math.min(100,energy+7);
      $("status").textContent=autoMode?"⚡ AUTO: secuencia resuelta.":"✓ Secuencia completada.";
      flashLevel();makeSequence();
    }else{
      $("target").textContent="NODO "+sequence[target];
      $("status").textContent=autoMode?"⚡ AUTO: objetivo alcanzado.":"✓ Correcto. Seguí el pulso.";
    }
  }else{
    el.classList.remove("bad");void el.offsetWidth;el.classList.add("bad");
    combo=1;energy-=settings[difficulty].wrong;
    $("status").textContent=`✕ Nodo incorrecto. -${settings[difficulty].wrong}% energía`;shake();
  }
  updateUI();checkEnergy();
}
function autoHitCurrent(){
  if(!running||paused||!autoMode)return;
  const n=sequence[target],el=nodeEls.find(x=>+x.dataset.id===n);
  if(el)hit(n,el);
}
async function automaticController(token){
  while(running&&autoMode&&token===autoToken){
    if(paused){await sleep(80);continue}
    const el=nodeEls.find(x=>+x.dataset.id===sequence[target]);
    if(el){
      el.classList.add("active");
      $("status").textContent="🤖 AUTO: procesando NODO "+sequence[target];
      await sleep(settings[difficulty].auto);
      el.classList.remove("active");
      if(running&&autoMode&&token===autoToken&&!paused)autoHitCurrent();
    }
    await sleep(Math.max(30,settings[difficulty].auto*.45));
  }
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function burst(el){
  const x=parseFloat(el.style.left)/100*W,y=parseFloat(el.style.top)/100*H;
  for(let i=0;i<22;i++){const a=Math.random()*Math.PI*2,s=1+Math.random()*4.5;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,c:colors[(Math.random()*colors.length)|0]})}
}
function shake(){const box=$("reactorWrap");box.animate([{transform:"translateX(-4px)"},{transform:"translateX(4px)"},{transform:"translateX(-2px)"},{transform:"translateX(0)"}],{duration:160})}
function flashLevel(){const f=$("levelFlash");f.classList.remove("show");void f.offsetWidth;f.classList.add("show")}
function updateUI(){
  const e=Math.max(0,Math.round(energy));$("energy").textContent=e;$("level").textContent=level;$("score").textContent=score;$("combo").textContent="x"+combo;$("corePct").textContent=e+"%";$("best").textContent=Math.max(best,score);
}
function checkEnergy(){if(energy<=0){energy=0;end(false)}}
function end(win){
  running=false;autoToken++;autoMode=false;
  if(score>best){best=score;localStorage.setItem("neonCoreBest",best)}
  $("game").classList.add("hidden");$("result").classList.remove("hidden");
  $("resultTitle").textContent=win?"SISTEMA ESTABLE":"REACTOR CRÍTICO";
  $("resultText").textContent=win?`Llegaste al nivel ${level} con una puntuación de ${score}.`:"La energía llegó a 0%. Superá tu récord en el próximo intento.";
  $("finalLevel").textContent=level;$("finalScore").textContent=score;$("finalBest").textContent=best;
}
function start(auto=false){
  autoToken++;autoMode=auto;energy=100;level=1;score=0;combo=1;paused=false;running=true;
  $("intro").classList.add("hidden");$("result").classList.add("hidden");$("game").classList.remove("hidden");
  $("autoToggle").textContent=auto?"AUTO: ON":"AUTO: OFF";$("autoToggle").classList.toggle("on",auto);
  $("pause").textContent="PAUSAR";$("status").textContent=auto?"🤖 IA lista.":"Esperando pulso...";
  makeSequence();updateUI();resize();last=performance.now();requestAnimationFrame(loop);
  if(auto)automaticController(autoToken);
}
function loop(t){
  if(!running)return;
  const dt=Math.min((t-last)/1000,.1);last=t;
  if(!paused){
    timeLeft-=dt;
    if(timeLeft<=0){
      energy-=settings[difficulty].loss;combo=1;makeSequence();
      $("status").textContent=autoMode?`⌛ AUTO: pulso perdido. -${settings[difficulty].loss}%`:`⌛ Pulso perdido. -${settings[difficulty].loss}%`;
      updateUI();checkEnergy();
      if(!running)return;
    }
    const maxTime=Math.max(settings[difficulty].time-level*.075,1);
    $("timerFill").style.width=Math.max(0,Math.min(100,timeLeft/maxTime*100))+"%";
  }
  draw(t);requestAnimationFrame(loop);
}
function draw(t){
  ctx.clearRect(0,0,W,H);const cx=W/2,cy=H/2;
  ctx.strokeStyle="rgba(86,246,255,.08)";ctx.lineWidth=1;
  for(let r=65;r<Math.min(W,H)*.75;r+=48){ctx.beginPath();ctx.arc(cx,cy,r+(t*.015%48),0,Math.PI*2);ctx.stroke()}
  ctx.strokeStyle="rgba(86,246,255,.12)";
  for(let i=0;i<16;i++){const a=i*Math.PI/8+t*.00008;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*35,cy+Math.sin(a)*35);ctx.lineTo(cx+Math.cos(a)*Math.min(W,H)*.48,cy+Math.sin(a)*Math.min(W,H)*.48);ctx.stroke()}
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=.98;p.vy*=.98;p.life-=.035;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,3,3)});
  ctx.globalAlpha=1;particles=particles.filter(p=>p.life>0);
}
$("start").onclick=()=>start(false);
$("autoStart").onclick=()=>start(true);
$("restart").onclick=()=>start(false);
$("autoToggle").onclick=()=>{
  if(!running)return;
  autoMode=!autoMode;autoToken++;
  $("autoToggle").textContent=autoMode?"AUTO: ON":"AUTO: OFF";$("autoToggle").classList.toggle("on",autoMode);
  $("status").textContent=autoMode?"🤖 Modo automático activado.":"🎮 Modo manual activado.";
  if(autoMode)automaticController(autoToken);
};
$("pause").onclick=()=>{
  if(!running)return;
  paused=!paused;$("pause").textContent=paused?"CONTINUAR":"PAUSAR";$("status").textContent=paused?"Sistema pausado.":"Sistema reactivado.";
};
$("quit").onclick=()=>{if(running){running=false;autoToken++;autoMode=false;$("game").classList.add("hidden");$("intro").classList.remove("hidden")}};
document.addEventListener("keydown",e=>{
  if(e.key==="Enter"&&!running){e.preventDefault();start(false)}
  if(e.code==="Space"&&running){e.preventDefault();$("pause").click()}
});
window.addEventListener("blur",()=>{if(running&&!paused)$("pause").click()});
updateUI();
