import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { hashPassword } from "better-auth/crypto";

export interface TenantAdminCreds {
  email: string;
  password: string;
}

interface TenantLike {
  id: string;
  nom: string;
  contactNom: string | null;
  contactEmail: string | null;
}

/** Mot de passe temporaire lisible (sans caractères ambigus). */
function genPassword(len = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[randomInt(chars.length)];
  return out;
}

async function findUserByEmail(email: string) {
  const [u] = await db
    .select({ id: schema.users.id, tenantId: schema.users.tenantId })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  return u ?? null;
}

async function setCredentialPassword(userId: string, password: string) {
  const hashed = await hashPassword(password);
  await db
    .update(schema.accounts)
    .set({ password: hashed, updatedAt: new Date() })
    .where(
      and(
        eq(schema.accounts.userId, userId),
        eq(schema.accounts.providerId, "credential")
      )
    );
}

/**
 * Crée le compte administrateur (rôle gérant) du tenant si l'email de contact
 * n'a pas déjà de compte. Renvoie les identifiants (avec mot de passe) SI un
 * nouveau compte est créé ; sinon password=null (compte préexistant).
 */
export async function ensureTenantAdmin(
  tenant: TenantLike
): Promise<{ email: string; password: string | null; created: boolean } | null> {
  const email = tenant.contactEmail?.trim();
  if (!email) return null;

  const existing = await findUserByEmail(email);
  if (existing) {
    if (!existing.tenantId) {
      await db
        .update(schema.users)
        .set({ tenantId: tenant.id })
        .where(eq(schema.users.id, existing.id));
    }
    return { email, password: null, created: false };
  }

  const password = genPassword();
  try {
    const result = await auth.api.signUpEmail({
      body: { name: tenant.contactNom ?? tenant.nom, email, password },
    });
    const userId = result?.user?.id;
    if (!userId) return null;
    await db
      .update(schema.users)
      .set({ role: "gerant", tenantId: tenant.id })
      .where(eq(schema.users.id, userId));
    return { email, password, created: true };
  } catch (e) {
    console.error("[tenant-account] création compte:", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Réinitialise (ou crée) le mot de passe du compte admin du tenant et renvoie
 * les identifiants — pour un renvoi « avec identifiants ».
 */
export async function resetTenantAdminPassword(
  tenant: TenantLike
): Promise<TenantAdminCreds | null> {
  const email = tenant.contactEmail?.trim();
  if (!email) return null;

  const password = genPassword();
  const existing = await findUserByEmail(email);

  if (existing) {
    await setCredentialPassword(existing.id, password);
    if (!existing.tenantId) {
      await db
        .update(schema.users)
        .set({ tenantId: tenant.id })
        .where(eq(schema.users.id, existing.id));
    }
    return { email, password };
  }

  // Pas de compte encore → on le crée avec ce mot de passe
  try {
    const result = await auth.api.signUpEmail({
      body: { name: tenant.contactNom ?? tenant.nom, email, password },
    });
    const userId = result?.user?.id;
    if (!userId) return null;
    await db
      .update(schema.users)
      .set({ role: "gerant", tenantId: tenant.id })
      .where(eq(schema.users.id, userId));
    return { email, password };
  } catch (e) {
    console.error("[tenant-account] reset:", e instanceof Error ? e.message : e);
    return null;
  }
}
