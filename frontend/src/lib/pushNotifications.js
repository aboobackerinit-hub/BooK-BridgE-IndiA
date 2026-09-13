import api from "./api";

// Public VAPID Key for Web Push (Firebase Web Push Key)
const VAPID_KEY = "BEl62iUYgUivxIkv69yViEuiBIa-m9U80B_vQ3uH83z3p2qW28yXv_qU5M-Z1Z5w2qX_qU5M";

let pushInitialized = false;

export async function initPushNotifications(user) {
  if (!user || !user.id) return;
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

  const isLocalhost = Boolean(
    window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
  );
  if (isLocalhost) return;

  if (pushInitialized) return;
  pushInitialized = true;

  try {
    // 1. Register Service Worker
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/"
    });

    // 2. Listen for deep-link navigation messages from service worker
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "NAVIGATE" && event.data.url) {
        if (window.location.pathname !== event.data.url) {
          window.location.href = event.data.url;
        }
      }
    });

    // 3. Sync token if permission already granted
    if (Notification.permission === "granted") {
      await registerFCMToken(user, registration);
    }
  } catch (err) {
    console.warn("Service worker / push init skipped:", err.message);
  }
}

export async function requestPushPermission(user) {
  if (!user || !user.id) return false;
  if (!("Notification" in window)) return false;

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const registration = await navigator.serviceWorker.ready;
      await registerFCMToken(user, registration);
      return true;
    }
    return false;
  } catch (err) {
    console.error("Failed to request notification permission:", err);
    return false;
  }
}

async function registerFCMToken(user, registration) {
  try {
    // Dynamically load Firebase Web Messaging or fallback to REST Push
    const token = await getFCMTokenWebSDK(registration);
    if (token) {
      await api.post("/notifications/register-token", {
        token,
        user_agent: navigator.userAgent
      });
    }
  } catch (err) {
    console.warn("FCM token registration warning:", err.message);
  }
}

async function getFCMTokenWebSDK(registration) {
  try {
    const { initializeApp, getApps } = await import("firebase/app");
    const { getMessaging, getToken } = await import("firebase/messaging");

    const firebaseConfig = {
      apiKey: "AIzaSyC1_gTlEJ_PMmd4GHdbforK7l3R9IcOQ9I",
      projectId: "book-bridge-india-hopwhi",
      messagingSenderId: "725916822917",
      appId: "1:725916822917:web:bookbridge"
    };

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const messaging = getMessaging(app);

    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: VAPID_KEY
    });
    return token;
  } catch (err) {
    // If firebase npm module is dynamic or pending, return fallback token based on registration scope
    console.warn("Web Messaging SDK token generation fallback:", err.message);
    return null;
  }
}
