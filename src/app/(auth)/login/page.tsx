// app/login/page.tsx (Next.js App Router example)
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff } from "lucide-react";
import { Toaster, toast } from "sonner";
import { useRouter } from "next/navigation";
import ProfileLogo from "@/../public/profile.png";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import Image from "next/image";

// ✅ validation schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });
  const router = useRouter();

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok || data?.success === false) {
        toast.error(`${data.error}`);
        return;
      }
      if (res.ok) {
        // Save role-specific info
        localStorage.setItem("token", String(data.token));
        if (data?.role === "admin" && data?.admin) {
          localStorage.setItem("adminDetails", JSON.stringify(data.admin));
        }
        if (data?.role === "user" && data?.branch) {
          localStorage.setItem("branchDetails", JSON.stringify(data.branch));
        }
        toast.success("Login successful");
        router.push(data?.role === "admin" ? "/admin/dashboard" : "/");
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      toast.error("An error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Toaster position="top-right" expand={true} richColors />

      <div className="w-full max-w-md space-y-8">
        {/* Logo & Brand */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl">
              <Image
                src={ProfileLogo}
                alt="Logo"
                width={50}
                height={50}
                className="transition-all duration-200 object-contain"
              />{" "}
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 uppercase">
              lazzanio
            </h1>
          </div>
        </div>

        <Card className="border shadow-lg bg-white dark:bg-gray-800">
          <CardHeader className="space-y-2 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Sign In
              </CardTitle>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Enter your credentials to access your account
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Username */}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-gray-700 dark:text-gray-300">
                        Username
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter your username"
                          className="h-12 border-gray-200 dark:border-gray-600 focus:border-gray-400 focus:ring-gray-400"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-gray-700 dark:text-gray-300">
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="h-12 pr-12 border-gray-200 dark:border-gray-600 focus:border-gray-400 focus:ring-gray-400"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
                          >
                            {showPassword ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 text-white dark:text-gray-900 font-medium rounded-lg transition-all duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
