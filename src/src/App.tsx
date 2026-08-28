import { useEffect, useState } from 'react';
import { Bell, BellRing, Send, Info, Download } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
  return outputArray;
}

export default function App() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [swSupported, setSwSupported] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js').then(swReg => {
        swReg.pushManager.getSubscription().then(sub => setIsSubscribed(sub !== null));
      }).catch(() => setSwSupported(false));
    } else {
      setSwSupported(false);
    }
  }, []);

  const subscribeUser = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { alert('Vui lòng cấp quyền!'); return; }
      const response = await fetch('/api/vapid-public-key');
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(await response.text())
      });
      await fetch('/api/subscribe', { method: 'POST', body: JSON.stringify(sub), headers: { 'Content-Type': 'application/json' }});
      setIsSubscribed(true);
      alert('Đăng ký thành công!');
    } catch (e) { alert('Lỗi đăng ký!'); }
  };

  const sendTestNotification = async () => {
    if (!notificationMsg.trim()) return;
    setIsSending(true);
    await fetch('/api/send-notification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: notificationMsg }) });
    setNotificationMsg("");
    setIsSending(false);
    alert('Đã gửi!');
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black flex flex-col">
      <iframe src="/api/app-frame" className="w-full flex-grow border-0" title="Taxi" />
      <button onClick={() => setShowControls(!showControls)} className="absolute bottom-6 right-6 p-4 rounded-full bg-yellow-400 z-50">
        {isSubscribed ? <BellRing size={24} /> : <Bell size={24} />}
      </button>
      {showControls && (
        <div className="absolute bottom-24 right-6 w-[340px] bg-white p-5 rounded-2xl z-40">
          <h3 className="font-bold mb-4">Thông báo App</h3>
          {swSupported && !isSubscribed ? (
            <button onClick={subscribeUser} className="w-full bg-blue-600 text-white py-2 rounded-xl">Bật Thông Báo</button>
          ) : swSupported && isSubscribed ? (
            <div className="bg-yellow-50 p-4 rounded-xl">
              <input type="text" value={notificationMsg} onChange={e => setNotificationMsg(e.target.value)} className="w-full px-3 py-2 mb-2 border rounded-lg" placeholder="Nội dung push..."/>
              <button onClick={sendTestNotification} disabled={isSending} className="w-full bg-yellow-400 py-2 rounded-lg font-bold">Gửi Push</button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
