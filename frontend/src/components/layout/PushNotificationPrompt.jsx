import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { requestPushPermission } from "@/lib/pushNotifications";
import { Button } from "@/components/ui/button";
import { BellRing, X } from "lucide-react";

export const PushNotificationPrompt = () => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Check if notifications are supported and currently in 'default' state (not granted or denied)
    if ("Notification" in window && Notification.permission === "default") {
      // Don't show immediately on login, add a slight delay
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleEnable = async () => {
    setLoading(true);
    const success = await requestPushPermission(user);
    setLoading(false);
    if (success) {
      setShow(false);
    } else {
      // If denied, the browser won't let us ask again anyway.
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 bg-primary text-primary-foreground p-4 rounded-xl shadow-xl flex items-start gap-4 z-50 animate-in slide-in-from-bottom-5">
      <BellRing className="w-6 h-6 mt-1 flex-shrink-0" />
      <div className="flex-1">
        <h4 className="font-bold text-sm mb-1">Turn on Notifications</h4>
        <p className="text-xs opacity-90 mb-3">
          Get instantly notified about new chat messages, book sales, and admin announcements.
        </p>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1 h-8 text-xs font-bold" 
            onClick={handleEnable}
            disabled={loading}
          >
            {loading ? "Enabling..." : "Enable Push"}
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 px-2 opacity-70 hover:opacity-100"
            onClick={() => setShow(false)}
          >
            Not Now
          </Button>
        </div>
      </div>
      <button onClick={() => setShow(false)} className="absolute top-2 right-2 opacity-50 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
