"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      const response = await api.post("/auth/signin", data);
      const { accessToken, refreshToken, mustChangePassword } = response.data;

      // Store tokens in localStorage
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);

      // Decode JWT to get user info (basic decode without verification)
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: payload.sub,
          email: payload.email,
          role: payload.role,
        })
      );

      toast.success("Login successful!");
      router.push(mustChangePassword ? "/change-password" : "/dashboard");
    } catch (error: unknown) {
      console.error("Login error:", error);
      const err = error as {
        code?: string;
        message?: string;
        response?: { status?: number };
      };
      const status = err?.response?.status;
      const isNetworkError =
        err?.code === "ERR_NETWORK" ||
        err?.message === "Network Error" ||
        (err?.response === undefined && err?.message?.includes("fetch"));
      if (isNetworkError) {
        toast.error(
          "Connection failed. Please check your internet and ensure the server is running."
        );
      } else if (status && status >= 500) {
        toast.error("Something went wrong. Please try again later.");
      } else {
        toast.error("Invalid credentials. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">H</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">HeckTeck SMS</CardTitle>
          <CardDescription>
            Enter your credentials to access the School Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="admin@heckteck.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Demo Credentials:</p>
            <p className="font-mono text-xs">admin@heckteck.com / Admin@123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
