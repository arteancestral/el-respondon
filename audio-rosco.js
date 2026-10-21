/* EL RESPONDÓN — Música de rosco, independiente de Supabase. */
(()=>{
'use strict';
const audio=new Audio(new URL('./musica-rosco.mp3',document.currentScript?.src||location.href).href);
audio.loop=true;audio.preload='none';audio.volume=.07;
let volume=.07, muted=false, started=false, manualMic=false;
const $=id=>document.getElementById(id);
const controls=document.createElement('div');
controls.setAttribute('aria-label','Música del rosco');
controls.style.cssText='position:fixed;bottom:14px;right:14px;z-index:9998;background:#111a35ee;color:white;border:1px solid #7db5ff;border-radius:14px;padding:10px 14px;display:flex;align-items:center;gap:9px;font:14px system-ui;box-shadow:0 4px 20px #0007';
controls.innerHTML='<button id="roscoAudioMute" type="button" aria-label="Silenciar música" style="border:0;border-radius:8px;padding:6px;cursor:pointer">🔉</button><label for="roscoAudioVolume">Música</label><input id="roscoAudioVolume" type="range" min="0" max="20" value="7" aria-label="Volumen de música" style="width:90px"><span id="roscoAudioPct">7%</span>';
document.body.append(controls);
function active(){return started && !($('pause')?.disabled===true && $('start')?.disabled===false) && !($('start')?.disabled===false && $('pause')?.disabled===true)}
function voiceBusy(){return !!(window.speechSynthesis&&(speechSynthesis.speaking||speechSynthesis.pending));}
function micBusy(){return manualMic || ($('microphone')?.textContent||'').includes('Detener escucha') || ($('micStatus')?.textContent||'').startsWith('Escuchando');}
function update(){
 const shouldMute=muted||voiceBusy()||micBusy()||document.hidden||!started;
 // Mute entirely during spoken questions and microphone capture to avoid acoustic feedback.
 audio.volume=shouldMute?0:volume;
 $('roscoAudioMute').textContent=muted?'🔇':'🔉';
 $('roscoAudioPct').textContent=Math.round(volume*100)+'%';
}
$('roscoAudioMute').onclick=()=>{muted=!muted;update()};
$('roscoAudioVolume').oninput=e=>{volume=Number(e.target.value)/100;muted=false;update()};
function play(){started=true;audio.play().catch(()=>{});update()}
function stop(){started=false;audio.pause();update()}
$('start')?.addEventListener('click',()=>setTimeout(play,0));
$('pause')?.addEventListener('click',stop);
$('new')?.addEventListener('click',stop);
$('microphone')?.addEventListener('pointerdown',()=>{manualMic=true;update()},true);
$('microphone')?.addEventListener('click',()=>setTimeout(()=>{manualMic=micBusy();update()},250));
$('microphone')?.addEventListener('click',()=>setTimeout(()=>{manualMic=false;update()},1500));
// Game's speech recognition state and TTS are sampled independently of UI transitions.
setInterval(()=>{
 if(started && ($('status')?.textContent||'').includes('Tiempo agotado'))stop();
 if(started && ($('status')?.textContent||'').includes('Pausado'))stop();
 if(started && ($('status')?.textContent||'').includes('Pausa automática'))stop();
 if(started && $('start')?.disabled===false && $('pause')?.disabled===true)stop();
 update();
},80);
document.addEventListener('visibilitychange',update);
window.addEventListener('pagehide',stop);
})();
