"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { signIn } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Minimum 6 caractères"),
});

type Fields = z.infer<typeof schema>;

const COMPTES_DEMO = [
  { role: "Admin", email: "admin@ppn.mg", mdp: "admin123" },
  { role: "Agent", email: "agent@ppn.mg", mdp: "agent123" },
  { role: "Caissier", email: "caisse@ppn.mg", mdp: "caisse123" },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/rapports";
  const [showPwd, setShowPwd] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Fields) => {
    const result = await signIn.email({
      email: data.email,
      password: data.password,
    });

    if (result.error) {
      toast.error("Identifiants incorrects", {
        description: "Vérifiez votre email et votre mot de passe.",
      });
      return;
    }

    router.push(redirect);
    router.refresh();
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[--foreground]">
              Email
            </label>
            <Input
              {...register("email")}
              type="email"
              placeholder="vous@ppn.mg"
              autoComplete="email"
              error={!!errors.email}
            />
            {errors.email && (
              <p className="text-xs text-[--destructive]">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[--foreground]">
              Mot de passe
            </label>
            <div className="relative">
              <Input
                {...register("password")}
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                error={!!errors.password}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[--foreground-subtle] hover:text-[--foreground] transition-colors"
              >
                {showPwd ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-[--destructive]">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={isSubmitting}
          >
            <LogIn className="w-4 h-4" />
            Se connecter
          </Button>
        </form>

        {/* Comptes de démo */}
        <div className="space-y-2">
          <p className="text-xs text-[--foreground-subtle] text-center font-medium uppercase tracking-wide">
            Comptes de démo
          </p>
          <div className="grid grid-cols-3 gap-2">
            {COMPTES_DEMO.map((c) => (
              <button
                key={c.role}
                type="button"
                onClick={() => {
                  setValue("email", c.email);
                  setValue("password", c.mdp);
                }}
                className={cn(
                  "text-xs text-center py-2 px-2 rounded-lg border border-[--border]",
                  "bg-[--background-subtle] hover:bg-[--accent] hover:border-[--primary]/40",
                  "text-[--foreground-muted] hover:text-[--foreground]",
                  "transition-all duration-150"
                )}
              >
                <span className="font-medium block">{c.role}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
