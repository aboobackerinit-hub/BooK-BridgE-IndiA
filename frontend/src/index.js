import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { toast } from "sonner";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);



if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        setInterval(() => {
          registration.update();
        }, 1000 * 60 * 60);

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New update installed and waiting (or skipped waiting).');
            }
          });
        });
      })
      .catch(err => {
        console.log('SW registration failed: ', err);
      });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      toast('A new version is available!', {
        description: 'Please refresh to apply the latest updates.',
        action: {
          label: 'Refresh Now',
          onClick: () => {
            refreshing = true;
            window.location.reload();
          },
        },
        duration: Infinity,
      });
    });
  });
}
