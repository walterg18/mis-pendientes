(function(){
  var C = window.APP_CONFIG || {};
  var SB_URL = C.SB_URL, SB_KEY = C.SB_KEY, TABLE = C.TABLE || 'notas_pendientes';
  var db = window.supabase.createClient(SB_URL, SB_KEY);
  var items = []; var activeTab = 'todos';
  var TYPE_LABEL = {tarea:'Tarea', responder:'Correo por responder', enviar:'Correo por enviar', nota:'Nota'};
  var TYPE_ICON  = {tarea:'📋', responder:'📥', enviar:'📤', nota:'🗒️'};
  var STAT_LABEL = {stat_vencidos:'Vencidos', stat_hoy:'Para hoy', stat_proximos:'Próximos 7 días', stat_completados:'Completados hoy'};

  function setStatus(t){ document.getElementById('status').textContent = t; }
  function todayStr(){ var d=new Date(); d.setHours(0,0,0,0); var m=('0'+(d.getMonth()+1)).slice(-2); var day=('0'+d.getDate()).slice(-2); return d.getFullYear()+'-'+m+'-'+day; }
  function dayDiff(s){ if(!s) return null; var a=new Date(s+'T00:00:00'); var b=new Date(todayStr()+'T00:00:00'); return Math.round((a-b)/86400000); }
  function fmtDate(s){ var d=new Date(s+'T00:00:00'); return d.toLocaleDateString('es',{day:'numeric',month:'short'}); }
  function fmtStamp(s){ if(!s) return ''; var d=new Date(s); return d.toLocaleDateString('es',{day:'numeric',month:'short',year:'numeric'}); }
  function dateClass(s,done){ if(done) return 'done'; if(!s) return 'nodate'; var d=dayDiff(s); if(d<0) return 'overdue'; if(d===0) return 'today'; return 'upcoming'; }
  function dateBadge(s){ var d=dayDiff(s); var cls='date-upcoming'; var txt=fmtDate(s); if(d<0){cls='date-overdue';txt='Vencido · '+fmtDate(s)+(d===-1?' (ayer)':' ('+(-d)+' días)');} else if(d===0){cls='date-today';txt='Hoy';} else if(d===1){txt='Mañana';} else {txt='En '+d+' días · '+fmtDate(s);} return '<span class="badge '+cls+'">📅 '+txt+'</span>'; }
  function esc(s){ return (s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function sortPending(arr){ return arr.slice().sort(function(a,b){ if(a.fecha&&b.fecha) return a.fecha<b.fecha?-1:(a.fecha>b.fecha?1:0); if(a.fecha) return -1; if(b.fecha) return 1; return (b.creado||'')<(a.creado||'')?-1:1; }); }
  function byStamp(arr,field){ return arr.slice().sort(function(a,b){ return (b[field]||'')<(a[field]||'')?-1:1; }); }

  // filtros de estado
  function isPending(it){ return !it.hecha && !it.eliminada; }
  function isHistory(it){ return it.hecha && !it.eliminada; }
  function isTrash(it){ return it.eliminada; }

  async function load(){ setStatus('Cargando…'); var r=await db.from(TABLE).select('*'); if(r.error){ setStatus('Error de conexión'); console.error(r.error); return; } items=r.data||[]; setStatus('✔ Guardado en la nube'); render(); }
  async function addItem(){ var t=document.getElementById('newTitle').value.trim(); if(!t){ document.getElementById('newTitle').focus(); return; } var obj={titulo:t, tipo:document.getElementById('newType').value, fecha:document.getElementById('newDate').value||null, prioridad:document.getElementById('newPrio').value, nota:document.getElementById('newNote').value.trim()||null, hecha:false, eliminada:false}; setStatus('Guardando…'); var r=await db.from(TABLE).insert(obj).select(); if(r.error){ setStatus('Error al guardar'); console.error(r.error); return; } document.getElementById('newTitle').value=''; document.getElementById('newDate').value=''; document.getElementById('newNote').value=''; await load(); }
  async function patch(id,fields){ setStatus('Guardando…'); var r=await db.from(TABLE).update(fields).eq('id',id); if(r.error){ setStatus('Error al guardar'); console.error(r.error); return; } await load(); }
  async function hardRemove(id){ setStatus('Eliminando…'); var r=await db.from(TABLE).delete().eq('id',id); if(r.error){ setStatus('Error'); console.error(r.error); return; } await load(); }
  function findById(id){ for(var i=0;i<items.length;i++){ if(String(items[i].id)===String(id)) return items[i]; } return null; }

  function render(){
    // contadores
    var counts={todos:0,tarea:0,responder:0,enviar:0,nota:0,historial:0,papelera:0};
    items.forEach(function(it){
      if(isTrash(it)){ counts.papelera++; return; }
      if(isHistory(it)){ counts.historial++; return; }
      counts.todos++; if(counts[it.tipo]!==undefined) counts[it.tipo]++;
    });
    ['todos','tarea','responder','enviar','nota','historial','papelera'].forEach(function(k){ document.getElementById('c-'+k).textContent=counts[k]; });

    // resumen del día (solo pendientes activos)
    var over=0,tod=0,soon=0,doneToday=0;
    items.forEach(function(it){
      if(isHistory(it)){ if(it.hecha_en===todayStr()) doneToday++; return; }
      if(!isPending(it)) return;
      var d=dayDiff(it.fecha); if(d===null) return; if(d<0) over++; else if(d===0) tod++; else if(d<=7) soon++;
    });
    document.getElementById('s-over').textContent=over; document.getElementById('s-today').textContent=tod; document.getElementById('s-soon').textContent=soon; document.getElementById('s-done').textContent=doneToday;
    var urgent=sortPending(items.filter(function(it){ return isPending(it)&&it.fecha&&dayDiff(it.fecha)<=0; })).slice(0,5);
    var bl=document.getElementById('briefList');
    if(urgent.length){ bl.innerHTML=urgent.map(function(it){ var c=dateClass(it.fecha,false); var color=c==='overdue'?'var(--red)':'var(--amber)'; return '<div class="brief-item"><span class="dot" style="background:'+color+'"></span><strong>'+TYPE_ICON[it.tipo]+'</strong> '+esc(it.titulo)+' <span style="color:var(--muted);margin-left:auto;font-size:12px">'+(dayDiff(it.fecha)<0?'vencido':'hoy')+'</span></div>'; }).join(''); }
    else { bl.innerHTML='<div class="brief-empty">🎉 Nada vencido ni para hoy. ¡Vas al día!</div>'; }

    // resaltar la tarjeta del resumen seleccionada
    var statEls=document.querySelectorAll('.brief-stats .stat');
    for(var si=0; si<statEls.length; si++){ statEls[si].classList.toggle('sel', activeTab==='stat_'+statEls[si].dataset.filter); }

    // barra de herramientas
    var info=document.getElementById('toolbarInfo'); var trashBtn=document.getElementById('emptyTrash');
    trashBtn.classList.add('hidden');
    if(activeTab==='historial'){ info.textContent='Lo que ya completaste (más reciente primero)'; }
    else if(activeTab==='papelera'){ info.textContent='Elementos eliminados — puedes restaurarlos'; if(counts.papelera>0) trashBtn.classList.remove('hidden'); }
    else if(activeTab.indexOf('stat_')===0){ info.textContent='Mostrando: '+STAT_LABEL[activeTab]+' · toca una pestaña para volver'; }
    else { info.textContent='Ordenado por fecha (lo urgente primero)'; }

    // lista
    var list=document.getElementById('list'); var filtered;
    if(activeTab==='historial'){ filtered=byStamp(items.filter(isHistory),'hecha_en'); }
    else if(activeTab==='papelera'){ filtered=byStamp(items.filter(isTrash),'eliminada_en'); }
    else if(activeTab==='stat_vencidos'){ filtered=sortPending(items.filter(function(it){ return isPending(it)&&it.fecha&&dayDiff(it.fecha)<0; })); }
    else if(activeTab==='stat_hoy'){ filtered=sortPending(items.filter(function(it){ return isPending(it)&&it.fecha&&dayDiff(it.fecha)===0; })); }
    else if(activeTab==='stat_proximos'){ filtered=sortPending(items.filter(function(it){ return isPending(it)&&it.fecha&&dayDiff(it.fecha)>=1&&dayDiff(it.fecha)<=7; })); }
    else if(activeTab==='stat_completados'){ filtered=byStamp(items.filter(function(it){ return isHistory(it)&&it.hecha_en===todayStr(); }),'hecha_en'); }
    else { filtered=sortPending(items.filter(function(it){ return isPending(it) && (activeTab==='todos'?true:it.tipo===activeTab); })); }

    if(!filtered.length){
      var msg;
      if(activeTab==='papelera') msg='La papelera está vacía. 🗑️';
      else if(activeTab==='historial') msg='Aquí aparecerá lo que vayas completando. ✅';
      else if(activeTab==='stat_vencidos') msg='No tienes nada vencido. 🎉';
      else if(activeTab==='stat_hoy') msg='No tienes nada para hoy. 🎉';
      else if(activeTab==='stat_proximos') msg='Nada en los próximos 7 días.';
      else if(activeTab==='stat_completados') msg='Aún no has completado nada hoy.';
      else msg='No hay nada aquí todavía. Agrega tu primer pendiente arriba ☝️';
      list.innerHTML='<div class="empty">'+msg+'</div>'; return;
    }
    list.innerHTML=filtered.map(itemHTML).join('');
  }

  function itemHTML(it){
    var prio=it.prioridad||'media';
    // PAPELERA
    if(isTrash(it)){
      return '<div class="item nodate" data-id="'+it.id+'" style="opacity:.8">'+
        '<div style="width:20px;flex:none;text-align:center;margin-top:1px">🗑️</div>'+
        '<div class="item-main">'+
          '<div class="title">'+esc(it.titulo)+'</div>'+
          (it.nota?'<div class="note-text">'+esc(it.nota)+'</div>':'')+
          '<div class="meta"><span class="badge prio-baja">'+TYPE_ICON[it.tipo]+' '+TYPE_LABEL[it.tipo]+'</span>'+(it.eliminada_en?'<span class="badge prio-baja">Eliminado el '+fmtStamp(it.eliminada_en)+'</span>':'')+'</div>'+
          '<div class="item-actions">'+
            '<button class="act" data-act="restore">♻️ Restaurar</button>'+
            '<button class="act del" data-act="harddel">✖ Borrar definitivo</button>'+
          '</div>'+
        '</div>'+
      '</div>';
    }
    // HISTORIAL (completadas)
    if(isHistory(it)){
      return '<div class="item done" data-id="'+it.id+'">'+
        '<div class="check on" data-act="reopen">✓</div>'+
        '<div class="item-main">'+
          '<div class="title">'+esc(it.titulo)+'</div>'+
          (it.nota?'<div class="note-text">'+esc(it.nota)+'</div>':'')+
          '<div class="meta"><span class="badge prio-baja">'+TYPE_ICON[it.tipo]+' '+TYPE_LABEL[it.tipo]+'</span>'+(it.hecha_en?'<span class="badge date-today">✅ Completado el '+fmtStamp(it.hecha_en)+'</span>':'')+'</div>'+
          '<div class="item-actions">'+
            '<button class="act" data-act="reopen">↩️ Reabrir</button>'+
            '<button class="act del" data-act="del">🗑 Enviar a papelera</button>'+
          '</div>'+
        '</div>'+
      '</div>';
    }
    // PENDIENTES
    var cls=dateClass(it.fecha,false); var badges='';
    if(it.fecha) badges+=dateBadge(it.fecha);
    badges+='<span class="badge prio-'+prio+'">'+(prio==='alta'?'🔴':prio==='media'?'🟠':'⚪')+' '+prio+'</span>';
    badges+='<span class="badge prio-baja">'+TYPE_ICON[it.tipo]+' '+TYPE_LABEL[it.tipo]+'</span>';
    return '<div class="item '+cls+'" data-id="'+it.id+'">'+
      '<div class="check" data-act="toggle"></div>'+
      '<div class="item-main">'+
        '<div class="title">'+esc(it.titulo)+'</div>'+
        (it.nota?'<div class="note-text">'+esc(it.nota)+'</div>':'')+
        '<div class="meta">'+badges+'</div>'+
        '<div class="item-actions">'+
          '<button class="act" data-act="snooze">⏰ +1 día</button>'+
          '<button class="act" data-act="resched">📆 Reagendar</button>'+
          '<button class="act del" data-act="del">🗑 Eliminar</button>'+
        '</div>'+
        '<div class="reschedule hidden" data-resched>'+
          '<input type="date" data-newdate value="'+(it.fecha||'')+'">'+
          '<button class="btn mini" data-act="saveresched">Guardar</button>'+
          '<button class="act" data-act="cancelresched">Cancelar</button>'+
          '<button class="act" data-act="cleardate">Quitar fecha</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  }

  document.getElementById('list').addEventListener('click', function(e){
    var btn=e.target.closest('[data-act]'); if(!btn) return; var itemEl=e.target.closest('.item'); if(!itemEl) return; var it=findById(itemEl.dataset.id); if(!it) return; var act=btn.dataset.act;
    if(act==='toggle'){ if(confirm('¿Ya completaste "'+it.titulo+'"?\n\nSe moverá a tu Historial. (Podrás reabrirla si te equivocas.)')) patch(it.id,{hecha:true, hecha_en:todayStr()}); }
    else if(act==='reopen'){ patch(it.id,{hecha:false, hecha_en:null}); }
    else if(act==='del'){ patch(it.id,{eliminada:true, eliminada_en:new Date().toISOString()}); }
    else if(act==='restore'){ patch(it.id,{eliminada:false, eliminada_en:null}); }
    else if(act==='harddel'){ if(confirm('¿Borrar definitivamente "'+it.titulo+'"? Esto no se puede deshacer.')) hardRemove(it.id); }
    else if(act==='snooze'){ var base=it.fecha&&dayDiff(it.fecha)>0?it.fecha:todayStr(); var d=new Date(base+'T00:00:00'); d.setDate(d.getDate()+1); var m=('0'+(d.getMonth()+1)).slice(-2); var day=('0'+d.getDate()).slice(-2); patch(it.id,{fecha:d.getFullYear()+'-'+m+'-'+day}); }
    else if(act==='resched'){ itemEl.querySelector('[data-resched]').classList.toggle('hidden'); }
    else if(act==='cancelresched'){ itemEl.querySelector('[data-resched]').classList.add('hidden'); }
    else if(act==='saveresched'){ patch(it.id,{fecha:itemEl.querySelector('[data-newdate]').value||null}); }
    else if(act==='cleardate'){ patch(it.id,{fecha:null}); }
  });
  document.getElementById('addBtn').addEventListener('click', addItem);
  document.getElementById('newTitle').addEventListener('keydown', function(e){ if(e.key==='Enter') addItem(); });
  document.getElementById('emptyTrash').addEventListener('click', async function(){
    var trash=items.filter(isTrash); if(!trash.length) return;
    if(!confirm('¿Vaciar la papelera? Se borrarán definitivamente '+trash.length+' elemento(s). Esto no se puede deshacer.')) return;
    setStatus('Vaciando papelera…');
    for(var i=0;i<trash.length;i++){ await db.from(TABLE).delete().eq('id',trash[i].id); }
    await load();
  });
  document.getElementById('tabs').addEventListener('click', function(e){ var t=e.target.closest('.tab'); if(!t) return; activeTab=t.dataset.tab; var all=document.querySelectorAll('.tab'); for(var i=0;i<all.length;i++) all[i].classList.remove('active'); t.classList.add('active'); render(); });
  var briefStats=document.querySelector('.brief-stats');
  if(briefStats){ briefStats.addEventListener('click', function(e){ var s=e.target.closest('.stat'); if(!s||!s.dataset.filter) return; activeTab='stat_'+s.dataset.filter; var all=document.querySelectorAll('.tab'); for(var i=0;i<all.length;i++) all[i].classList.remove('active'); render(); }); }

  // ===== Notificaciones push =====
  var VAPID_PUBLIC='BOe70c9molFJkcVlOjcFekRyIkw0LaeLdm3rywN4IL6qZOu8tNK3C-zbuNerYzb-WfKcpzBKQIf1s1JaVzVbOvg';
  var swReg=null;
  function urlB64ToUint8(b64){ var pad='='.repeat((4-b64.length%4)%4); var s=(b64+pad).replace(/-/g,'+').replace(/_/g,'/'); var raw=atob(s); var arr=new Uint8Array(raw.length); for(var i=0;i<raw.length;i++) arr[i]=raw.charCodeAt(i); return arr; }
  function updateNotifBtn(){ var b=document.getElementById('notifBtn'); if(!b) return; if(!('Notification' in window)){ b.style.display='none'; return; } if(Notification.permission==='granted'){ b.textContent='🔔 Avisos activados'; b.disabled=true; b.style.opacity='.7'; } else { b.textContent='🔔 Activar avisos'; b.disabled=false; b.style.opacity='1'; } }
  async function initPush(){ if(!('serviceWorker' in navigator)||!('PushManager' in window)){ var b=document.getElementById('notifBtn'); if(b) b.style.display='none'; return; } try{ swReg=await navigator.serviceWorker.register('sw.js'); }catch(e){ console.error('SW',e); } updateNotifBtn(); }
  async function activarAvisos(){ try{ if(!('serviceWorker' in navigator)||!('PushManager' in window)){ alert('Tu navegador no soporta notificaciones.'); return; } var perm=await Notification.requestPermission(); if(perm!=='granted'){ alert('Para recibir avisos debes permitir las notificaciones en el navegador.'); updateNotifBtn(); return; } var reg=swReg||await navigator.serviceWorker.ready; var sub=await reg.pushManager.getSubscription(); if(!sub){ sub=await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey:urlB64ToUint8(VAPID_PUBLIC) }); } var j=sub.toJSON(); await db.from('push_subs').insert({ endpoint:j.endpoint, p256dh:j.keys.p256dh, auth:j.keys.auth }); updateNotifBtn(); alert('¡Avisos activados en este dispositivo! Te llegarán a las 9 y 10 aunque tengas la app cerrada.'); }catch(e){ console.error(e); alert('No se pudo activar: '+(e&&e.message?e.message:e)); } }
  var notifBtnEl=document.getElementById('notifBtn'); if(notifBtnEl){ notifBtnEl.addEventListener('click', activarAvisos); }

  // ===== Capturar correo por foto (OCR local con Tesseract.js) =====
  var fotoDataUrl=null;
  function openFoto(){ var m=document.getElementById('fotoModal'); if(m) m.classList.remove('hidden'); }
  function closeFoto(){ var m=document.getElementById('fotoModal'); if(m) m.classList.add('hidden'); }
  function resetFoto(){ fotoDataUrl=null; var f=document.getElementById('fotoFile'); if(f) f.value=''; var p=document.getElementById('fotoPrev'); if(p){ p.classList.add('hidden'); p.src=''; } var r=document.getElementById('fotoResult'); if(r) r.classList.add('hidden'); var pr=document.getElementById('fotoProg'); if(pr) pr.textContent=''; var rd=document.getElementById('fotoRead'); if(rd) rd.disabled=true; }
  async function leerFoto(){
    if(!fotoDataUrl){ return; }
    if(typeof Tesseract==='undefined'){ document.getElementById('fotoProg').textContent='La herramienta de lectura aún se está cargando, espera unos segundos e intenta de nuevo.'; return; }
    var prog=document.getElementById('fotoProg'); var btn=document.getElementById('fotoRead');
    btn.disabled=true; prog.textContent='Leyendo la imagen… (la primera vez puede tardar un poco)';
    try{
      var res=await Tesseract.recognize(fotoDataUrl, 'spa+eng', { logger:function(m){ if(m.status==='recognizing text'){ prog.textContent='Leyendo… '+Math.round((m.progress||0)*100)+'%'; } } });
      var text=((res && res.data && res.data.text) || '').replace(/\n{3,}/g,'\n\n').trim();
      document.getElementById('fotoText').value=text;
      var lines=text.split('\n').map(function(l){return l.trim();}).filter(function(l){return l.length>3;});
      document.getElementById('fotoTitle').value=(lines[0]||'Correo importante').slice(0,90);
      document.getElementById('fotoResult').classList.remove('hidden');
      prog.textContent='✔ Listo. Revisa el título y edita el texto si hace falta.';
    }catch(e){ console.error(e); prog.textContent='No se pudo leer la imagen. Intenta con una foto más clara.'; }
    btn.disabled=false;
  }
  async function agregarDesdeFoto(){
    var t=document.getElementById('fotoTitle').value.trim(); if(!t){ alert('Escribe un título para el pendiente.'); return; }
    var obj={ titulo:t, tipo:document.getElementById('fotoType').value, fecha:document.getElementById('fotoDate').value||null, prioridad:document.getElementById('fotoPrio').value, nota:document.getElementById('fotoText').value.trim()||null, hecha:false, eliminada:false };
    var r=await db.from(TABLE).insert(obj); if(r.error){ alert('Error al guardar: '+r.error.message); return; }
    closeFoto(); resetFoto(); await load(); alert('¡Correo agregado a tus pendientes! 📥');
  }
  var _fb=document.getElementById('fotoBtn'); if(_fb) _fb.addEventListener('click', openFoto);
  var _fc=document.getElementById('fotoClose'); if(_fc) _fc.addEventListener('click', function(){ closeFoto(); });
  var _ff=document.getElementById('fotoFile'); if(_ff) _ff.addEventListener('change', function(e){ var f=e.target.files && e.target.files[0]; if(!f) return; var rd=new FileReader(); rd.onload=function(){ fotoDataUrl=rd.result; var img=document.getElementById('fotoPrev'); img.src=fotoDataUrl; img.classList.remove('hidden'); document.getElementById('fotoRead').disabled=false; document.getElementById('fotoProg').textContent='Imagen lista. Toca "Leer correo".'; }; rd.readAsDataURL(f); });
  var _fr=document.getElementById('fotoRead'); if(_fr) _fr.addEventListener('click', leerFoto);
  var _fa=document.getElementById('fotoAdd'); if(_fa) _fa.addEventListener('click', agregarDesdeFoto);
  var _fm=document.getElementById('fotoModal'); if(_fm) _fm.addEventListener('click', function(e){ if(e.target===_fm) closeFoto(); });

  var now=new Date(); var h=now.getHours();
  document.getElementById('greet').textContent = h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';
  document.getElementById('today').textContent = now.toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  load();
  initPush();
})();
