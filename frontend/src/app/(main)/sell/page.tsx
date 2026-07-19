"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const sellSchema = z.object({
  title: z.string().min(2, "Title is required"),
  author: z.string().min(2, "Author is required"),
  isbn: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  condition: z.string().min(1, "Condition is required"),
  transaction_type: z.string().min(1, "Transaction type is required"),
  description: z.string().optional(),
});

type SellFormValues = z.infer<typeof sellSchema>;

export default function SellPage() {
  const { user, dbUser } = useAuthStore();
  const router = useRouter();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<SellFormValues>({
    resolver: zodResolver(sellSchema),
    defaultValues: {
      transaction_type: "sell",
    }
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold font-heading mb-4">Please log in to list a book</h2>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </div>
    );
  }

  const onSubmit = async (data: SellFormValues) => {
    setIsSubmitting(true);
    try {
      // In real app, first upload image to Cloudinary, get URL, then submit
      const payload = {
        ...data,
        price: parseFloat(data.price),
        seller_id: dbUser?.id,
        college: dbUser?.college,
        location_district: dbUser?.location_district,
        location_state: dbUser?.location_state,
        status: "available"
      };
      
      // await apiClient.post("/books", payload);
      
      // Simulate API call
      await new Promise(r => setTimeout(r, 1000));
      
      toast.success("Book listed successfully!");
      setIsSuccess(true);
    } catch (error) {
      toast.error("Failed to list book");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-lg text-center">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold font-heading mb-4">Listing Successful!</h1>
        <p className="text-muted-foreground mb-8">
          Your book is now live and can be seen by students at {dbUser?.college || "your campus"}.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => router.push("/profile")}>View My Listings</Button>
          <Button variant="outline" onClick={() => setIsSuccess(false)}>List Another Book</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-heading mb-2">List a Book</h1>
        <p className="text-muted-foreground">Add details about the book you want to sell, donate, or exchange.</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Image Upload Mock */}
            <div className="space-y-4">
              <Label>Book Images</Label>
              <div className="border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                <UploadCloud className="w-10 h-10 text-muted-foreground mb-4" />
                <p className="font-medium mb-1">Click to upload images</p>
                <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB. Clear photos sell faster!</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="title">Book Title *</Label>
                <Input id="title" placeholder="e.g. Introduction to Algorithms" {...register("title")} />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Author(s) *</Label>
                <Input id="author" placeholder="e.g. Thomas H. Cormen" {...register("author")} />
                {errors.author && <p className="text-sm text-destructive">{errors.author.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="isbn">ISBN (Optional)</Label>
                <Input id="isbn" placeholder="13-digit ISBN" {...register("isbn")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction_type">Listing Type *</Label>
                <Select onValueChange={(v) => setValue("transaction_type", v)} defaultValue={watch("transaction_type")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sell">Sell</SelectItem>
                    <SelectItem value="exchange">Exchange</SelectItem>
                    <SelectItem value="donate">Donate (Free)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.transaction_type && <p className="text-sm text-destructive">{errors.transaction_type.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input 
                  id="price" 
                  type="number" 
                  placeholder="0" 
                  disabled={watch("transaction_type") === "donate"}
                  {...register("price")} 
                />
                {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Condition *</Label>
                <Select onValueChange={(v) => setValue("condition", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Like New</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair (Some highlights/notes)</SelectItem>
                    <SelectItem value="poor">Poor (Missing pages)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.condition && <p className="text-sm text-destructive">{errors.condition.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <textarea 
                id="description" 
                rows={4}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Mention any specific details like edition, missing pages, or subjects it covers."
                {...register("description")} 
              />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Listing Book..." : "List Book"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
