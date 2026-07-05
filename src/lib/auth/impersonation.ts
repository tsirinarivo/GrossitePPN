import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const IMPERSONATE_PREFIX = "impersonate:";

/**
 * Plugin d'impersonation « login as » pour le super-admin plateforme.
 *
 * Le master crée un jeton à usage unique (stocké dans `verifications`) puis
 * redirige le navigateur vers le sous-domaine du tenant. Cet endpoint valide
 * le jeton et crée une VRAIE session Better-Auth pour le compte du tenant
 * (cookie posé sur le bon sous-domaine, signature gérée nativement).
 */
export const impersonation = () => ({
  id: "impersonation",
  endpoints: {
    consumeImpersonation: createAuthEndpoint(
      "/impersonation/consume",
      {
        method: "GET",
        query: z.object({
          token: z.string(),
          callbackURL: z.string().optional(),
        }),
      },
      async (ctx) => {
        const token = ctx.query.token;
        const callbackURL = ctx.query.callbackURL || "/dashboard";
        const identifier = `${IMPERSONATE_PREFIX}${token}`;

        const [row] = await db
          .select()
          .from(schema.verifications)
          .where(eq(schema.verifications.identifier, identifier))
          .limit(1);

        // Jeton absent ou expiré → login normal.
        if (!row || new Date(row.expiresAt).getTime() < Date.now()) {
          throw ctx.redirect("/login?error=impersonation_invalide");
        }

        // Usage unique.
        await db.delete(schema.verifications).where(eq(schema.verifications.identifier, identifier));

        const [user] = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, row.value))
          .limit(1);
        if (!user) throw ctx.redirect("/login?error=impersonation_invalide");

        const session = await ctx.context.internalAdapter.createSession(user.id);
        if (!session) throw ctx.redirect("/login?error=impersonation_invalide");

        await setSessionCookie(ctx, { session, user });
        throw ctx.redirect(callbackURL);
      }
    ),
  },
});
