"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { auth } from "@/lib/firebase/config";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, GraduationCap, Building2 } from "lucide-react";

// In a real app, these would come from an API
const states = ["Kerala", "Tamil Nadu", "Karnataka", "Maharashtra", "Delhi"];
const districtsByState: Record<string, string[]> = {
  Kerala: ["Thiruvananthapuram", "Kollam", "Ernakulam", "Thrissur", "Kozhikode", "Kannur"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli"],
  // Add more as needed
};
const colleges = [
  "College of Engineering Trivandrum",
  "NIT Calicut",
  "IIT Madras",
  "Christ University",
  "Other"
];

const onboardingSchema = z.object({
  state: z.string().min(1, "Please select a state"),
  district: z.string().min(1, "Please select a district"),
  college: z.string().min(1, "Please select a college"),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
  });

  const selectedState = watch("state");

  useEffect(() => {
    // Reset district if state changes
    if (selectedState) {
      setValue("district", "");
    }
  }, [selectedState, setValue]);

  const onSubmit = async (data: OnboardingFormValues) => {
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("You must be logged in to complete onboarding");
        router.push("/login");
        return;
      }

      // Update backend profile with location and college
      await apiClient.put(`/users/${user.uid}`, {
        location_state: data.state,
        location_district: data.district,
        college: data.college,
        onboarding_completed: true,
      });

      toast.success("Profile setup complete!");
      router.push("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to save profile details.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl font-bold text-foreground mb-2">Almost there!</h1>
          <p className="text-muted-foreground text-lg">
            Tell us where you are studying to find books near you.
          </p>
        </div>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>
              We use this to prioritize book listings near your location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center text-foreground">
                  <MapPin className="w-4 h-4 mr-2 text-primary" /> Location
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Select onValueChange={(val) => setValue("state", val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label>District</Label>
                    <Select 
                      disabled={!selectedState} 
                      onValueChange={(val) => setValue("district", val)}
                      value={watch("district")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select District" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedState && districtsByState[selectedState]?.map((district) => (
                          <SelectItem key={district} value={district}>{district}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.district && <p className="text-sm text-destructive">{errors.district.message}</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium flex items-center text-foreground">
                  <GraduationCap className="w-4 h-4 mr-2 text-primary" /> Education
                </h3>
                
                <div className="space-y-2">
                  <Label>College / University</Label>
                  <Select onValueChange={(val) => setValue("college", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your college" />
                    </SelectTrigger>
                    <SelectContent>
                      {colleges.map((college) => (
                        <SelectItem key={college} value={college}>{college}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.college && <p className="text-sm text-destructive">{errors.college.message}</p>}
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? "Saving..." : "Complete Setup"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
