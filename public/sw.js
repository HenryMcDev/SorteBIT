self.addEventListener('push', function(event) {
  let data = {};
  
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    // Fallback caso o backend mande texto puro em vez de JSON stringificado
    data = {
      title: 'Uniforme Premiado',
      body: event.data ? event.data.text() : 'Você tem uma nova notificação!'
    };
  }
  
  // Extrai as variáveis garantindo strings válidas para o Android renderizar
  const title = data.title || data.notification?.title || 'Uniforme Premiado';
  const body = data.body || data.notification?.body || 'Abra o aplicativo para conferir!';
  const icon = data.icon || data.notification?.icon || 'https://tawhebqohhpqtvijcdvj.supabase.co/storage/v1/object/public/imagens/icon_up_192x192.webp';

  const options = {
    body: body,
    icon: icon, 
    badge: '/icons/badge-notificacao.png', 
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/check-in'
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Adiciona redirecionamento ao clicar na notificação
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/check-in';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(windowClients) {
      // Se já tiver uma aba aberta do app, navega ou foca nela
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Se não, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
