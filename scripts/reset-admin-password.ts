#!/usr/bin/env tsx
/**
 * Script de reset du mot de passe admin.
 *
 * Usage sur le VPS :
 *
 *   # Lister tous les utilisateurs admin/gérant
 *   pnpm tsx scripts/reset-admin-password.ts --list
 *
 *   # Reset le mot de passe d'un email existant
 *   pnpm tsx scripts/reset-admin-password.ts --email admin@example.com --password 'NouveauMotDePasse123!'
 *
 *   # Créer un nouveau super-admin (si aucun admin ne peut se connecter)
 *   pnpm tsx scripts/reset-admin-password.ts --create --email admin@grossiteppn.mg --password 'MotDePasseFort123!' --name 'Admin'
 *
 * Le script utilise l'API Better-Auth pour garantir le bon hashing (scrypt).
 */

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, or, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

type Args = {
  list?: boolean;
  create?: boolean;
  email?: string;
  password?: string;
  name?: string;
};

function parseArgs(): Args {
  const args: Args = {};
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (arg === "--list") args.list = true;
    else if (arg === "--create") args.create = true;
    else if (arg === "--email") args.email = raw[++i];
    else if (arg === "--password") args.password = raw[++i];
    else if (arg === "--name") args.name = raw[++i];
  }
  return args;
}

async function listAdmins() {
  const admins = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
      actif: schema.users.actif,
      createdAt: schema.users.createdAt,
    })
    .from(schema.users)
    .where(inArray(schema.users.role, ["admin", "gerant"]));

  if (admins.length === 0) {
    console.log("❌ Aucun utilisateur admin ou gérant trouvé.");
    console.log("   Créer un premier admin avec : --create --email X --password Y --name Z");
    return;
  }

  console.log(`\n📋 ${admins.length} utilisateur(s) admin/gerant :\n`);
  for (const u of admins) {
    const icon = u.actif ? "✅" : "🚫";
    console.log(`  ${icon} ${u.email}`);
    console.log(`     Nom     : ${u.name}`);
    console.log(`     Rôle    : ${u.role}`);
    console.log(`     Créé le : ${new Date(u.createdAt).toLocaleDateString("fr-FR")}`);
    console.log(`     ID      : ${u.id}`);
    console.log("");
  }
}

async function resetPassword(email: string, password: string) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (!user) {
    console.log(`❌ Aucun utilisateur trouvé avec email : ${email}`);
    console.log("   Utilise --list pour voir les utilisateurs existants.");
    process.exit(1);
  }

  if (password.length < 8) {
    console.log("❌ Le mot de passe doit faire au moins 8 caractères.");
    process.exit(1);
  }

  console.log(`🔑 Reset du mot de passe pour : ${user.email} (${user.role})`);

  // Better-Auth : on utilise directement le context de hashing pour rester cohérent
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = await (auth as any).$context;
  const hashedPassword = await ctx.password.hash(password);

  const [account] = await db
    .select()
    .from(schema.accounts)
    .where(
      or(
        eq(schema.accounts.userId, user.id),
        eq(schema.accounts.accountId, user.id)
      )
    )
    .limit(1);

  if (account) {
    await db
      .update(schema.accounts)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(schema.accounts.id, account.id));
    console.log("✅ Mot de passe mis à jour avec succès.");
  } else {
    // Créer un compte "credential" pour l'utilisateur (au cas où)
    await db.insert(schema.accounts).values({
      id: crypto.randomUUID(),
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("✅ Compte credential créé avec le nouveau mot de passe.");
  }

  // S'assure que le compte est actif
  if (!user.actif) {
    await db
      .update(schema.users)
      .set({ actif: true, updatedAt: new Date() })
      .where(eq(schema.users.id, user.id));
    console.log("✅ Compte réactivé (était désactivé).");
  }

  console.log(`\n🎉 Tu peux te connecter avec :`);
  console.log(`   Email    : ${user.email}`);
  console.log(`   Password : ${password}`);
}

async function createAdmin(email: string, password: string, name: string) {
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (existing) {
    console.log(`❌ Un utilisateur existe déjà avec cet email. Utilise --email ... --password ... (sans --create) pour reset son mot de passe.`);
    process.exit(1);
  }

  if (password.length < 8) {
    console.log("❌ Le mot de passe doit faire au moins 8 caractères.");
    process.exit(1);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = await (auth as any).$context;
  const hashedPassword = await ctx.password.hash(password);

  const now = new Date();
  const userId = crypto.randomUUID();

  await db.insert(schema.users).values({
    id: userId,
    email,
    name,
    emailVerified: true,
    role: "admin",
    actif: true,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(schema.accounts).values({
    id: crypto.randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  });

  console.log(`\n🎉 Super-admin créé :`);
  console.log(`   Email    : ${email}`);
  console.log(`   Nom      : ${name}`);
  console.log(`   Password : ${password}`);
  console.log(`   Rôle     : admin`);
}

async function main() {
  const args = parseArgs();

  if (args.list) {
    await listAdmins();
    process.exit(0);
  }

  if (args.create) {
    if (!args.email || !args.password || !args.name) {
      console.log("❌ Pour créer un admin : --create --email X --password Y --name Z");
      process.exit(1);
    }
    await createAdmin(args.email, args.password, args.name);
    process.exit(0);
  }

  if (args.email && args.password) {
    await resetPassword(args.email, args.password);
    process.exit(0);
  }

  console.log(`
🔐 Script de reset du mot de passe admin

Usage :

  # Lister les admins existants
  pnpm tsx scripts/reset-admin-password.ts --list

  # Reset le mot de passe d'un admin existant
  pnpm tsx scripts/reset-admin-password.ts --email admin@example.com --password 'MonNouveauMdp123!'

  # Créer un nouveau super-admin (si tu n'as plus d'accès du tout)
  pnpm tsx scripts/reset-admin-password.ts --create --email admin@example.com --password 'MonMdp123!' --name 'Admin'
`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Erreur :", err);
  process.exit(1);
});
