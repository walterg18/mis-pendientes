(function(){
  var C = window.APP_CONFIG || {};
  var SB_URL = C.SB_URL, SB_KEY = C.SB_KEY, TABLE = C.TABLE || 'notas_pendientes';
  var db = window.supabase.createClient(SB_URL, SB_KEY);
  var items = []; var activeTab = 'todos';
  var TYPE_LABEL = {tarea:'Tarea', responder:'Correo por responder', enviar:'Correo por enviar', nota:'Nota'};
  var TYPE_ICON  = {tarea:'📋', responder:'📥', enviar:'📤', nota:'🗒️'};

  function setStatus(t){ document.getElementById('status').textContent = t; }
  function todayStr(){ var d=new Date(); d.setHours(0,0,0,0); var m=('0'+(d.getMonth()+1)).slice(-2); var day=('0'+d.getDate()).slice(-2); return d.getFullYear()+'-'+m+'-'+day; }
  function dayDiff(s){ if(!s) return null; var a=new Date(s+'T00:00:00'); var b=new Date(todayStr()+'T00:00:00'); return Math.round((a-b)/86400000); }
  function fmtDate(s){ var d=new Date(s+'T00:00:00'); return d.toLocaleDateString('es',{day:'numeric',month:'short'}); }
  function dateClass(s,done){ if(done) return 'done'; if(!s) return 'nodate'; var d=dayDiff(s); if(d<0) return 'overdue'; if(d===0) return 'today'; return 'upcoming'; }
  function dateBadge(s){ var d=dayDiff(s); var cls='date-upcoming'; var txt=fmtDate(s); if(d<0){cls='date-overdue';txt='Vencido · '+fmtDate(s)+(d===-1?' (ayer)':' ('+(-d)+' días)');} else if(d===0){cls='date-today';txt='Hoy';} else if(d===1){txt='Mañana';} else {txt='En '+d+' días · '+fmtDate(s);} return '<span class="badge '+cls+'">📅 '+txt+'</span>'; }
  function esc(s){ return (s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function sortItems(arr){ return arr.slice().sort(function(a,b){ if(a.hecha!==b.hecha) return a.hecha?1:-1; if(a.fecha&&b.fecha) return a.fecha<b.fecha?-1:(a.fecha>b.fecha?1:0); if(a.fecha) return -1; if(b.fecha) return 1; return (b.creado||'')<(a.creado||'')?-1:1; }); }

  async function load(){ setStatus('Cargando…'); var r=await db.from(TABLE).select('*'); if(r.error){ setStatus('Error de conexión'); console.error(r.error); return; } items=r.data||[]; setStatus('✔ Guardado en la nube'); render(); }
  async function addItem(){ var t=document.getElementById('newTitle').value.trim(); if(!t){ document.getElementById('newTitle').focus(); return; } var obj={titulo:t, tipo:document.getElementById('newType').value, fecha:document.getElementById('newDate').value||null, prioridad:document.getElementById('newPrio').value, nota:document.getElementById('newNote').value.trim()||null, hecha:false}; setStatus('Guardando…'); var r=await db.from(TABLE).insert(obj).select(); if(r.error){ setStatus('Error al guardar'); console.error(r.error); return; } document.getElementById('newTitle').value=''; document.getElementById('newDate').value=''; document.getElementById('newNote').value=''; await load(); }
  async function patch(id,fields){ setStatus('Guardando…'); var r=await db.from(TABLE).update(fields).eq('id',id); if(r.error){ setStatus('Error al guardar'); console.error(r.error); return; } await load(); }
  async function remove(id){ setStatus('Eliminando…'); var r=await db.from(TABLE).delete().eq('id',id); if(r.error){ setStatus('Error'); console.error(r.error); return; } await load(); }
  function findById(id){ for(var i=0;i<items.length;i++){ if(String(items[i].id)===String(id)) return items[i]; } return null; }

  function render(){
    var showDone=document.getElementById('showDone').checked;
    var counts={todos:0,tarea:0,responder:0,enviar:0,nota:0};
    items.forEach(function(it){ if(!it.hecha){ counts.todos++; if(counts[it.tipo]!==undefined) counts[it.tipo]++; } });
    ['todos','tarea','responder','enviar','nota'].forEach(function(k){ document.getElementById('c-'+k).textContent=counts[k]; });
    var over=0,tod=0,soon=0,doneToday=0;
    items.forEach(function(it){ if(it.hecha){ if(it.hecha_en===todayStr()) doneToday++; return; } var d=dayDiff(it.fecha); if(d===null) return; if(d<0) over++; else if(d===0) tod++; else if(d<=7) soon++; });
    document.getElementById('s-over').textContent=over; document.getElementById('s-today').textContent=tod; document.getElementById('s-soon').textContent=soon; document.getElementById('s-done').textContent=doneToday;
    var urgent=sortItems(items.filter(function(it){ return !it.hecha&&it.fecha&&dayDiff(it.fecha)<=0; })).slice(0,5);
    var bl=document.getElementById('briefList');
    if(urgent.length){ bl.innerHTML=urgent.map(function(it){ var c=dateClass(it.fecha,false); var color=c==='overdue'?'var(--red)':'var(--amber)'; return '<div class="brief-item"><span class="dot" style="background:'+color+'"></span><strong>'+TYPE_ICON[it.tipo]+'</strong> '+esc(it.titulo)+' <span style="color:var(--muted);margin-left:auto;font-size:12px">'+(dayDiff(it.fecha)<0?'vencido':'hoy')+'</span></div>'; }).join(''); }
    else { bl.innerHTML='<div class="brief-empty">🎉 Nada vencido ni para hoy. ¡Vas al día!</div>'; }
    var filtered=items.filter(function(it){ return activeTab==='todos'?true:it.tipo===activeTab; });
    if(!showDone) filtered=filtered.filter(function(it){ return !it.hecha; });
    filtered=sortItems(filtered);
    var list=document.getElementById('list');
    if(!filtered.length){ list.innerHTML='<div class="empty">No hay nada aquí todavía. Agrega tu primer pendiente arriba ☝️</div>'; return; }
    list.innerHTML=filtered.map(itemHTML).join('');
  }
  function itemHTML(it){
    var cls=dateClass(it.fecha,it.hecha); var prio=it.prioridad||'media'; var badges='';
    if(it.fecha&&!it.hecha) badges+=dateBadge(it.fecha);
    if(it.fecha&&it.hecha) badges+='<span class="badge prio-baja">📅 '+fmtDate(it.fecha)+'</span>';
    badges+='<span class="badge prio-'+prio+'">'+(prio==='alta'?'🔴':prio==='media'?'🟠':'⚪')+' '+prio+'</span>';
    badges+='<span class="badge prio-baja">'+TYPE_ICON[it.tipo]+' '+TYPE_LABEL[it.tipo]+'</span>';
    return '<div class="item '+cls+'" data-id="'+it.id+'">'+
      '<div class="check '+(it.hecha?'on':'')+'" data-act="toggle">'+(it.hecha?'✓':'')+'</div>'+
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
    if(act==='toggle'){ patch(it.id,{hecha:!it.hecha, hecha_en:!it.hecha?todayStr():null}); }
    else if(act==='del'){ remove(it.id); }
    else if(act==='snooze'){ var base=it.fecha&&dayDiff(it.fecha)>0?it.fecha:todayStr(); var d=new Date(base+'T00:00:00'); d.setDate(d.getDate()+1); var m=('0'+(d.getMonth()+1)).slice(-2); var day=('0'+d.getDate()).slice(-2); patch(it.id,{fecha:d.getFullYear()+'-'+m+'-'+day}); }
    else if(act==='resched'){ itemEl.querySelector('[data-resched]').classList.toggle('hidden'); }
    else if(act==='cancelresched'){ itemEl.querySelector('[data-resched]').classList.add('hidden'); }
    else if(act==='saveresched'){ patch(it.id,{fecha:itemEl.querySelector('[data-newdate]').value||null}); }
    else if(act==='cleardate'){ patch(it.id,{fecha:null}); }
  });
  document.getElementById('addBtn').addEventListener('click', addItem);
  document.getElementById('newTitle').addEventListener('keydown', function(e){ if(e.key==='Enter') addItem(); });
  document.getElementById('showDone').addEventListener('change', render);
  document.getElementById('clearDone').addEventListener('click', async function(){ var done=items.filter(function(x){return x.hecha;}); if(!done.length) return; setStatus('Limpiando…'); for(var i=0;i<done.length;i++){ await db.from(TABLE).delete().eq('id',done[i].id); } await load(); });
  document.getElementById('tabs').addEventListener('click', function(e){ var t=e.target.closest('.tab'); if(!t) return; activeTab=t.dataset.tab; var all=document.querySelectorAll('.tab'); for(var i=0;i<all.length;i++) all[i].classList.remove('active'); t.classList.add('active'); render(); });

  var now=new Date(); var h=now.getHours();
  document.getElementById('greet').textContent = h<12?'Buenos días':h<19?'Buenas tardes':'Buenas noches';
  document.getElementById('today').textContent = now.toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  load();
})();
