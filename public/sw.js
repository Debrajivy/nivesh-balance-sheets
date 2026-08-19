const CACHE="nivesh-demo-v2",OFFLINE=["/overview","/balance-sheet","/favicon.ico"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(OFFLINE))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",e=>{const url=new URL(e.request.url);if(e.request.method!=="GET"||url.origin!==self.location.origin||!url.protocol.startsWith("http"))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("/overview"))))});
self.addEventListener("push",e=>{const data=e.data?e.data.json():{title:"Nivesh",body:"An obligation needs attention"};e.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:"/favicon.ico",data:{url:"/obligations"}}))});
self.addEventListener("notificationclick",e=>{e.notification.close();e.waitUntil(clients.openWindow(e.notification.data?.url||"/overview"))});
