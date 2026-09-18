import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

const LocationPrompt = () => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Check if we already asked
    const asked = localStorage.getItem(`gps_prompted_${user.id}`);
    
    // If we haven't asked and the user doesn't already have a recorded status
    if (!asked && !user.gps_permission_status) {
      // Small delay to not overwhelm on first render
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleNotNow = () => {
    localStorage.setItem(`gps_prompted_${user.id}`, "true");
    setShow(false);
  };

  const handleAllow = async () => {
    localStorage.setItem(`gps_prompted_${user.id}`, "true");
    setShow(false);

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      await saveStatus("error");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.put("/users/me/gps", {
            gps_permission_status: "granted",
            gps_lat: position.coords.latitude,
            gps_lng: position.coords.longitude,
          });
          toast.success("Location saved successfully");
        } catch (error) {
          console.error("Failed to save location", error);
        }
      },
      async (error) => {
        console.error("Geolocation error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          await saveStatus("denied");
        } else {
          await saveStatus("error");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const saveStatus = async (status) => {
    try {
      await api.put("/users/me/gps", {
        gps_permission_status: status,
      });
    } catch (e) {
      console.error("Failed to save status", e);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <Card className="p-4 shadow-xl border-primary/20 bg-background/95 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Allow BookBridge to access your location?</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Your location helps us provide location-based features and allows you to manage your location information. You can choose whether to allow access.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAllow} className="rounded-full flex-1">Allow Location</Button>
              <Button size="sm" variant="outline" onClick={handleNotNow} className="rounded-full flex-1">Not Now</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LocationPrompt;
