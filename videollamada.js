// EL RESPONDÓN: WebRTC 1:1. La señalización viaja por RPCs privados de Supabase.
export function prepararVideollamada({client, user, getRoom, getState}) {
 const $=id=>document.getElementById(id);
 const note=message=>{$('videoStatus').textContent=message};
 let pc=null,local=null,remoteId=null,connected=false,readyRemote=false,offerSent=false,after=0;
 let queued=[],loop=null,working=false,roomBefore='',audioOn=true,videoOn=true;
 let remoteStream=new MediaStream();
 const unlockButton=$('audioUnlock');
 const remoteAudio=document.createElement('audio');
 remoteAudio.id='respondonRemoteAudio';remoteAudio.autoplay=true;remoteAudio.playsInline=true;
 remoteAudio.preload='auto';remoteAudio.controls=false;remoteAudio.muted=false;remoteAudio.volume=1;
 document.body.appendChild(remoteAudio);
 let remoteAudioReady=false;
 const showUnlock=()=>{if(remoteAudioReady)unlockButton.classList.remove('hide')};
 const playAudio=async()=>{
  const tracks=remoteStream.getAudioTracks();
  if(!tracks.length){note('Conexión de vídeo activa, pero todavía no llega una pista de audio del rival.');return}
  remoteAudio.srcObject=remoteStream;
  remoteAudio.muted=false;remoteAudio.volume=1;
  try{
   await remoteAudio.play();
   unlockButton.classList.add('hide');
   note('Audio del rival activado. Si no se escucha, revisa el volumen y el micrófono del otro dispositivo.');
  }catch(e){
   showUnlock();
   console.warn('EL RESPONDÓN: reproducción de audio bloqueada:',e);
   note('Vídeo conectado. Pulsa «🔊 Activar sonido del rival» para habilitar el audio.');
  }
 };
 unlockButton.onclick=playAudio;
 remoteAudio.addEventListener('playing',()=>{unlockButton.classList.add('hide')});
 remoteAudio.addEventListener('error',()=>{showUnlock();note('No se pudo reproducir el audio del rival.')});
 const rtcConfig={iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]};
 async function send(kind,payload={}) {
  if(!remoteId||!getRoom())return;
  const {error}=await client.rpc('respondon_video_enviar',{p_code:getRoom(),p_to:remoteId,p_kind:kind,p_payload:payload});
  if(error)throw Error(error.message);
 }
 async function flush(){if(!pc?.remoteDescription)return;for(const c of queued.splice(0)){try{await pc.addIceCandidate(c)}catch(e){console.warn('ICE:',e)}}}
 function createPeer(){
  if(pc)return pc;
  pc=new RTCPeerConnection(rtcConfig);
  local?.getTracks().forEach(track=>pc.addTrack(track,local));
  pc.ontrack=e=>{
   const track=e.track;
   if(!remoteStream.getTracks().some(t=>t.id===track.id))remoteStream.addTrack(track);
   if(track.kind==='video'){
    const video=$('rivalCam');video.muted=true;video.srcObject=remoteStream;
    video.play().catch(()=>{});
   }
   if(track.kind==='audio'){
    remoteAudioReady=true;
    remoteAudio.srcObject=remoteStream;
    showUnlock(); // Permite iniciar el sonido mediante un gesto real del usuario.
    playAudio(); // Intenta la reproducción automática si el navegador lo permite.
    track.onunmute=()=>{showUnlock();playAudio()};
    track.onmute=()=>{showUnlock();note('La pista de audio del rival está temporalmente silenciada.')} ;
   }
   if(track.kind==='video')note('Vídeo conectado. Esperando audio del rival…');
  };
  pc.onicecandidate=e=>{if(e.candidate)send('ice',{candidate:e.candidate.toJSON()}).catch(err=>note(err.message))};
  pc.onconnectionstatechange=()=>{
   if(pc?.connectionState==='connected')note('Videollamada conectada.');
   if(pc?.connectionState==='failed')note('No se pudo establecer el vídeo. Algunas redes requieren un servidor TURN.');
   if(pc?.connectionState==='disconnected')note('Conexión interrumpida.');
  };
  return pc;
 }
 async function makeOffer(){if(!connected||!readyRemote||offerSent||!remoteId)return;
  offerSent=true;try{const p=createPeer();const offer=await p.createOffer();await p.setLocalDescription(offer);await send('offer',{sdp:p.localDescription.toJSON()});note('Conectando con el contrincante…')}
  catch(e){offerSent=false;note('No se pudo iniciar la llamada: '+e.message)}
 }
 async function onSignal(m){
  if(m.sender!==remoteId)return;
  const p=m.payload||{};
  if(m.kind==='ready'){readyRemote=true;if(connected&&isHost())await makeOffer();}
  if(m.kind==='offer'&&connected){const peer=createPeer();await peer.setRemoteDescription(p.sdp);await flush();const answer=await peer.createAnswer();await peer.setLocalDescription(answer);await send('answer',{sdp:peer.localDescription.toJSON()});note('Conectando con el contrincante…')}
  if(m.kind==='answer'&&pc){await pc.setRemoteDescription(p.sdp);await flush()}
  if(m.kind==='ice'&&p.candidate){if(pc?.remoteDescription){try{await pc.addIceCandidate(p.candidate)}catch(e){console.warn(e)}}else queued.push(p.candidate)}
  if(m.kind==='bye'){readyRemote=false;offerSent=false;closePeer();note('El contrincante desconectó su cámara y micrófono.');}
 }
 function isHost(){const players=getState()?.players||[];return players.find(p=>p.id===user.id)?.seat===1}
 function closePeer(){remoteAudioReady=false;remoteAudio.pause();remoteAudio.srcObject=null;remoteStream=new MediaStream();$('audioUnlock').classList.add('hide');if(pc){pc.ontrack=null;pc.onicecandidate=null;pc.close();pc=null}$('rivalCam').srcObject=null;queued=[];}
 async function poll(){if(working||!getRoom())return;working=true;
  try{
   const room=getRoom();if(room!==roomBefore){roomBefore=room;after=0;remoteId=null;readyRemote=false;offerSent=false;}
   const players=getState()?.players||[];const rival=players.find(p=>p.id!==user.id);
   if(rival&&remoteId!==rival.id){remoteId=rival.id;readyRemote=false;offerSent=false;if(connected)await send('ready')}
   const {data,error}=await client.rpc('respondon_video_recibir',{p_code:room,p_after:after});
   if(error)throw Error(error.message);
   for(const m of data||[]){after=Math.max(after,Number(m.id));try{await onSignal(m)}catch(e){note('Problema al conectar: '+e.message)}}
  }catch(e){if(connected)note('Señalización: '+e.message)}finally{working=false}
 }
 async function connect(){
  if(connected){await disconnect();return}
  if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection){note('Este navegador no permite videollamadas. Usa HTTPS y un navegador actualizado.');return}
  try{
   local=await navigator.mediaDevices.getUserMedia({video:true,audio:true});
   connected=true;audioOn=true;videoOn=true;
   $('localCam').srcObject=local;$('localCamNote').textContent='';
   $('cameraToggle').textContent='📷 Apagar cámara';$('micToggle').textContent='🎤 Silenciar';
   $('callToggle').textContent='📞 Colgar';
   createPeer();
   // La pulsación que inicia la llamada habilita la reproducción de audio en navegadores móviles.
   remoteAudio.muted=false;
   const players=getState()?.players||[];remoteId=players.find(p=>p.id!==user.id)?.id||null;
   if(remoteId)await send('ready');
   if(isHost()&&readyRemote)await makeOffer();
   note('Cámara y micrófono activos. Esperando al contrincante…');
  }catch(e){connected=false;local?.getTracks().forEach(t=>t.stop());local=null;closePeer();note('No se pudo iniciar la videollamada: '+e.message)}
 }
 async function disconnect(){if(connected&&remoteId)send('bye').catch(()=>{});
  connected=false;readyRemote=false;offerSent=false;closePeer();local?.getTracks().forEach(t=>t.stop());local=null;
  $('localCam').srcObject=null;$('localCamNote').textContent='Cámara apagada';
  $('callToggle').textContent='📞 Iniciar videollamada';$('cameraToggle').textContent='📷 Activar cámara';$('micToggle').textContent='🎤 Activar micrófono';
  note('Videollamada apagada.');
 }
 $('callToggle').onclick=connect;
 $('cameraToggle').onclick=()=>{if(!connected){note('Primero pulsa «Iniciar videollamada».');return}videoOn=!videoOn;local.getVideoTracks().forEach(t=>t.enabled=videoOn);$('cameraToggle').textContent=videoOn?'📷 Apagar cámara':'📷 Encender cámara';$('localCamNote').textContent=videoOn?'':'Cámara apagada'};
 $('micToggle').onclick=()=>{if(!connected){note('Primero pulsa «Iniciar videollamada».');return}audioOn=!audioOn;local.getAudioTracks().forEach(t=>t.enabled=audioOn);$('micToggle').textContent=audioOn?'🎤 Silenciar':'🎤 Activar micrófono'};
 loop=setInterval(poll,900);
 window.addEventListener('pagehide',()=>{clearInterval(loop);closePeer();local?.getTracks().forEach(t=>t.stop())});
 return {disconnect};
}
