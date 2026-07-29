// Service Worker para "Mis Pendientes" — muestra notificaciones push
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });

self.addEventListener('push', function(event){
  var data = { title: 'Mis Pendientes', body: '', url: 'https://walterg18.github.io/mis-pendientes/' };
  try { data = Object.assign(data, event.data.json()); }
  catch(e){ if(event.data){ data.body = event.data.text(); } }
  var options = {
    body: data.body || '',
    tag: 'pendientes',
    renotify: true,
    data: { url: data.url }
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Mis Pendientes', options));
});

self.addEventListener('notificationclick', function(event){
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || 'https://walterg18.github.io/mis-pendientes/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
      for(var i=0;i<list.length;i++){ if(list[i].url.indexOf('mis-pendientes')>=0 && 'focus' in list[i]) return list[i].focus(); }
      if(self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
