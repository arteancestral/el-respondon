/* EL RESPONDÓN — Música ambiental de la portada. Independiente de Supabase. */
(() => {
  'use strict';
  const init = () => {
    if (document.getElementById('portadaAudioControl')) return;
    const audio = new Audio('backgroundmusicmaster-quiz-master-382651.mp3');
    audio.loop = true;
    audio.preload = 'none';
    audio.volume = 0.20;
    let enabled = true;
    let activated = false;
    const box = document.createElement('div');
    box.id = 'portadaAudioControl';
    box.setAttribute('aria-label', 'Música ambiental de la portada');
    Object.assign(box.style, {
      position: 'fixed', bottom: '16px', right: '16px', zIndex: '99999',
      display: 'flex', alignItems: 'center', gap: '9px', padding: '9px 12px',
      borderRadius: '14px', background: '#101b36ee', color: '#fff',
      border: '1px solid #79bfff', font: '14px system-ui, sans-serif',
      boxShadow: '0 4px 18px #0008'
    });
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Activar o silenciar música de portada');
    Object.assign(toggle.style, {cursor:'pointer',background:'#294e83',color:'white',border:'0',borderRadius:'7px',padding:'6px 9px'});
    const label = document.createElement('span');
    label.textContent = 'Música';
    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = '0'; slider.max = '20'; slider.value = '20';
    slider.id = 'portadaAudioVolume';
    slider.setAttribute('aria-label', 'Volumen de música ambiental');
    slider.style.width = '75px';
    const pct = document.createElement('span');
    pct.style.minWidth = '30px';
    const paint = () => { toggle.textContent = enabled ? '🔊' : '🔇'; pct.textContent = `${Math.round(audio.volume * 100)}%`; };
    const play = () => {
      if (!enabled || document.hidden) return;
      activated = true;
      audio.play().catch(() => { /* El navegador puede requerir otro gesto. */ });
    };
    toggle.addEventListener('click', () => {
      enabled = !enabled;
      if (enabled) play(); else audio.pause();
      paint();
    });
    slider.addEventListener('input', () => {
      audio.volume = Number(slider.value) / 100;
      if (audio.volume > 0 && !enabled) enabled = true;
      if (audio.volume === 0) enabled = false;
      if (enabled) play(); else audio.pause();
      paint();
    });
    box.append(toggle, label, slider, pct);
    document.body.appendChild(box);
    paint();
    // Chrome bloquea el audio automático hasta que el visitante interactúa.
    const firstInteraction = () => {
      if (!activated && enabled) play();
    };
    document.addEventListener('pointerdown', firstInteraction, {capture:true});
    document.addEventListener('keydown', firstInteraction, {capture:true});
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) audio.pause();
      else if (activated && enabled) play();
    });
    window.addEventListener('pagehide', () => audio.pause());
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
