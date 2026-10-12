/* Push only: financial pages and API responses are never cached here. */
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let data={title:'NWallet',body:'Você tem um lembrete financeiro. Abra sua carteira.',url:'/?view=notifications'};
  try{data={...data,...event.data.json()};}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/icon-192.png',badge:'/favicon.png',tag:data.tag||'nwallet-reminder',data:{url:'/?view=notifications'}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const target=windows.find(client=>new URL(client.url).origin===self.location.origin);
    if(target){await target.navigate('/?view=notifications');return target.focus();}
    return self.clients.openWindow('/?view=notifications');
  })());
});
