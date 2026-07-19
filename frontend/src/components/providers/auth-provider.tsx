"use client";

import React, { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useAuthStore } from "@/store/auth-store";
import apiClient from "@/lib/api-client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setDbUser, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Fetch backend profile data
          const res = await apiClient.get(`/users/${firebaseUser.uid}`);
          setDbUser(res.data);
        } catch (error) {
          console.error("Error fetching backend user profile:", error);
          setDbUser(null);
        }
      } else {
        setDbUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setDbUser, setLoading]);

  return <>{children}</>;
}
