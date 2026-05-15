# Imprimante thermique — Guide d'implémentation complet

Système d'impression en deux modes :
1. **Cloud Xpyun/Xprinter** — WiFi/4G, pas de câble, file offline automatique *(principal)*
2. **WebUSB ESC/POS** — câble USB direct, fallback navigateur *(secondaire)*

---

## Sommaire

- [Dépendances](#dépendances)
- [Compte Xpyun à créer](#compte-xpyun-à-créer)
- [Modèles d'imprimante compatibles](#modèles-dimprimante-compatibles)
- [Structure des fichiers](#structure-des-fichiers)
- [Base de données](#base-de-données)
- [Couche service (lib)](#couche-service-lib)
- [API Routes](#api-routes)
- [Composant UI `PrinterSettings`](#composant-ui-printersettings)
- [Intégration dans la caisse POS](#intégration-dans-la-caisse-pos)
- [Checklist d'installation](#checklist-dinstallation)

---

## Dépendances

```json
// package.json — ajouter :
{
  "dependencies": {
    "pdf-lib": "^1.17.1"
  },
  "devDependencies": {
    "@types/w3c-web-usb": "^1.0.14"
  }
}
```

```bash
pnpm add pdf-lib
pnpm add -D @types/w3c-web-usb
```

**Aucune dépendance tierce pour ESC/POS ni pour Xpyun** — tout est implémenté en natif.

---

## Compte Xpyun à créer

1. Aller sur **[admin.xpyun.net](https://admin.xpyun.net)** (ou `gm.open.xpyun.net` / `sg.open.xpyun.net` selon la région)
2. Créer un compte développeur
3. Dans **Open Platform** → noter le **User** et le **UserKEY**
4. Connecter l'imprimante au WiFi via l'app **Xprinter** (iOS/Android)
5. Récupérer le **SN** (numéro de série) gravé sous l'imprimante

### Endpoints serveur disponibles

| Région | API base URL |
|--------|-------------|
| Chine | `https://open.xpyun.net/api/openapi/xprinter` |
| Allemagne | `https://gm.open.xpyun.net/api/openapi/xprinter` |
| Singapour | `https://sg.open.xpyun.net/api/openapi/xprinter` |

---

## Modèles d'imprimante compatibles

- **Xprinter XP-58IIH** / **XP-80C** — 58mm/80mm, WiFi+USB *(testé)*
- Tout modèle **Xpyun cloud** : XP-N160II, XP-E200L, etc.
- Fallback USB : Epson TM-T20, Bixolon SRP-350, Rongta RP322 (tout ESC/POS 80mm USB)

---

## Structure des fichiers

```
src/
├── lib/
│   ├── print/
│   │   ├── escpos.ts          ← Driver WebUSB ESC/POS (ticket thermique 80mm)
│   │   └── pdf-facture.ts     ← Génération PDF avec pdf-lib
│   └── xprint/
│       ├── client.ts          ← Client HTTP API Xpyun (SHA1 signature)
│       ├── format.ts          ← Formatage contenu ticket (balises xpyun)
│       └── service.ts         ← Service : load config, send+log, auto-print
├── db/
│   └── schema/
│       └── xprint.ts          ← Table print_logs (Drizzle ORM)
└── app/
    └── api/
        ├── admin/
        │   └── printer/
        │       ├── route.ts           ← GET/PUT config imprimante
        │       └── logs/
        │           └── route.ts       ← GET historique impressions
        └── print/
            ├── ticket/route.ts        ← POST imprimer une facture
            ├── status/route.ts        ← GET statut imprimante online/offline
            ├── test/route.ts          ← POST ticket de test
            └── logs/
                └── refresh/route.ts   ← POST rafraîchir statuts "pending"

src/components/domain/admin/
└── printer-settings.tsx       ← Panel de configuration UI complet
```

---

## Base de données

### Schema Drizzle — `src/lib/db/schema/xprint.ts`

```typescript
import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const printLogs = pgTable(
  "print_logs",
  {
    id: text("id").primaryKey(),
    sn: text("sn").notNull(),                        // SN imprimante
    kind: text("kind").notNull(),                    // "facture" | "test" | "bon_livraison" | "inventaire"
    relatedId: text("related_id"),                   // ID facture/commande liée
    content: text("content").notNull(),              // 500 premiers chars du ticket
    copies: integer("copies").default(1).notNull(),
    status: text("status").notNull(),                // "pending" | "printed" | "failed"
    orderId: text("order_id"),                       // Order ID Xpyun (pour poll statut)
    error: text("error"),                            // Message d'erreur si failed
    failedAt: timestamp("failed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("print_logs_status_idx").on(t.status),
    index("print_logs_created_idx").on(t.createdAt),
  ]
);
```

### Migration SQL — `src/lib/db/migrations/0001_xprint.sql`

```sql
CREATE TABLE IF NOT EXISTS "print_logs" (
  "id" text PRIMARY KEY,
  "sn" text NOT NULL,
  "kind" text NOT NULL,
  "related_id" text,
  "content" text NOT NULL,
  "copies" integer DEFAULT 1 NOT NULL,
  "status" text NOT NULL,
  "order_id" text,
  "error" text,
  "failed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "print_logs_status_idx" ON "print_logs" ("status");
CREATE INDEX IF NOT EXISTS "print_logs_created_idx" ON "print_logs" ("created_at");
```

### Champ `parametres` dans la table entreprise

La config Xpyun est stockée dans un champ **JSON** `parametres` de la table entreprise (pas de table séparée). Clés utilisées :

```json
{
  "xprintEnabled": true,
  "xprintUser": "mon_user_xpyun",
  "xprintKey": "ma_cle_secrete",
  "xprintSn": "XP-12345678",
  "xprintBaseUrl": "https://open.xpyun.net/api/openapi/xprinter",
  "xprintCopies": 1,
  "xprintVoice": 0,
  "xprintHeader": "Ligne 1 en-tête\nLigne 2",
  "xprintFooter": "Merci !",
  "xprintAutoOnFacture": true,
  "xprintAutoOnBonLivraison": false,
  "xprintAutoOnReceptionStock": false
}
```

Si votre projet n'a pas de table entreprise, créez une table `settings` avec un champ `jsonb` et adaptez `loadXprintConfig()`.

---

## Couche service (lib)

### `src/lib/xprint/client.ts` — Client HTTP Xpyun

```typescript
import crypto from "crypto";

const DEFAULT_BASE_URL = "https://open.xpyun.net/api/openapi/xprinter";

export interface XprintConfig {
  user: string;
  key: string;
  baseUrl: string;
  sn: string;
  copies: number;
  voice: number;
  header: string | null;
  footer: string | null;
  autoOnFacture: boolean;
  autoOnBonLivraison: boolean;
  autoOnReceptionStock: boolean;
}

interface XprintResponse<T> {
  ok: boolean;
  code: number;
  msg: string;
  data: T | null;
}

function sign(user: string, key: string, timestamp: string): string {
  return crypto.createHash("sha1").update(user + key + timestamp).digest("hex");
}

export async function callXprint<T>(
  cfg: Pick<XprintConfig, "user" | "key" | "baseUrl">,
  action: string,
  privateParams: Record<string, unknown>,
): Promise<XprintResponse<T>> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = {
    ...privateParams,
    user: cfg.user,
    timestamp,
    sign: sign(cfg.user, cfg.key, timestamp),
    debug: "0",
  };
  try {
    const res = await fetch(`${cfg.baseUrl}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json;charset=UTF-8" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (!data) return { ok: false, code: -100, msg: "Réponse invalide", data: null };
    return { ok: data.code === 0, code: data.code, msg: data.msg, data: data.data ?? null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, code: -1, msg, data: null };
  }
}

export async function xprintSend(
  cfg: XprintConfig,
  content: string,
  copies = 1,
): Promise<{ ok: boolean; orderId?: string; code: number; msg: string }> {
  const res = await callXprint<string>(cfg, "print", {
    sn: cfg.sn,
    content,
    copies,
    mode: 1, // file d'attente si hors ligne
  });
  return {
    ok: res.ok,
    orderId: typeof res.data === "string" ? res.data : undefined,
    code: res.code,
    msg: res.msg,
  };
}

export async function xprintStatus(
  cfg: Pick<XprintConfig, "user" | "key" | "baseUrl" | "sn">,
): Promise<{ online: boolean; anomalie: boolean; raw: number | null }> {
  const res = await callXprint<number>(cfg, "queryPrinterStatus", { sn: cfg.sn });
  if (!res.ok || res.data === null) return { online: false, anomalie: false, raw: null };
  return {
    online: res.data === 1,
    anomalie: res.data === 2,
    raw: res.data,
  };
}

export async function xprintQueryOrder(
  cfg: Pick<XprintConfig, "user" | "key" | "baseUrl">,
  orderId: string,
): Promise<boolean> {
  const res = await callXprint<boolean>(cfg, "queryOrderState", { orderId });
  return res.ok && res.data === true;
}

const XPYUN_ERRORS: Record<number, string> = {
  1002: "Signature invalide (vérifier User et UserKEY)",
  1003: "Timestamp invalide (décalage horloge serveur)",
  1006: "Numéro de série (SN) inconnu ou non rattaché au compte",
  1007: "Contenu trop long (> 4096 bytes)",
  1008: "Imprimante hors ligne",
  1010: "Limite de débit dépassée — réessayer dans quelques secondes",
};

export function xprintErrorMessage(code: number, defaultMsg: string): string {
  return XPYUN_ERRORS[code] ?? defaultMsg;
}

export function buildDefaultConfig(partial: Partial<XprintConfig>): XprintConfig {
  return {
    user: partial.user ?? "",
    key: partial.key ?? "",
    baseUrl: partial.baseUrl ?? DEFAULT_BASE_URL,
    sn: partial.sn ?? "",
    copies: partial.copies ?? 1,
    voice: partial.voice ?? 0,
    header: partial.header ?? null,
    footer: partial.footer ?? null,
    autoOnFacture: partial.autoOnFacture ?? true,
    autoOnBonLivraison: partial.autoOnBonLivraison ?? false,
    autoOnReceptionStock: partial.autoOnReceptionStock ?? false,
  };
}
```

---

### `src/lib/xprint/format.ts` — Mise en forme des tickets

> Format de contenu Xpyun : balises `<C>` (center), `<L>` (left), `<B>` (double-width bold), `<BOLD>` (bold normal), `<BR>` (saut de ligne), `<QR>...</QR>` (QR code).
> Largeur : **48 chars** pour 80mm, **32 chars** pour 58mm.

**Points critiques :**
- `Intl.NumberFormat("fr-FR")` génère des **NBSP U+00A0 et NNBSP U+202F** → carré sur l'imprimante → les remplacer manuellement
- Les accents doivent être supprimés (codepage CP437) → `normalize("NFD")` + strip diacritiques
- `<CUT>` **ne pas utiliser** — xpyun coupe automatiquement

```typescript
export function normaliseForThermal(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")           // strip diacritiques
    .replace(/œ/g, "oe").replace(/Œ/g, "OE")
    .replace(/æ/g, "ae").replace(/Æ/g, "AE")
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/€/g, "EUR")
    .replace(/(\d)[  ](\d)/g, "$1.$2") // NBSP entre chiffres → "."
    .replace(/[  ]/g, " ");
}

export function escapeXprint(s: string): string {
  return normaliseForThermal(s).replace(/</g, "(").replace(/>/g, ")");
}
```

**Trois formats disponibles :**
- `formatFactureTicket(opts: TicketFactureOpts): string` — ticket de caisse / facture
- `formatBonLivraison(opts: BonLivraisonOpts): string` — bon de livraison avec zone signature
- `formatFicheInventaire(opts: FicheInventaireOpts): string` — fiche de comptage inventaire

Types complets :

```typescript
export interface LigneTicket {
  nom: string;
  qte: number;
  unite: string;
  prixUnitaire: number;
  total: number;
}

export interface TicketFactureOpts {
  entrepriseNom: string;
  entrepriseAdresse?: string | null;
  entrepriseTelephone?: string | null;
  nif?: string | null;            // NIF fiscal Madagascar
  stat?: string | null;           // Numéro statistique
  rcs?: string | null;            // Registre du commerce
  assujettieTV?: boolean;
  tauxTVA?: number | null;
  numeroFacture: string;
  date: Date;
  clientNom?: string | null;
  lignes: LigneTicket[];
  sousTotal: number;
  tva?: number | null;
  total: number;
  modePaiement?: string | null;
  qrPayload?: string | null;      // max 256 chars, sans < >
  header?: string | null;         // Texte custom en-tête (multilignes avec \n)
  footer?: string | null;         // Texte custom pied
}

export interface BonLivraisonOpts {
  entrepriseNom: string;
  bonCode: string;
  date: Date;
  clientNom: string;
  clientTelephone?: string | null;
  clientAdresse?: string | null;
  chauffeurNom?: string | null;
  vehiculePlaque?: string | null;
  lignes: { ref: string; nom: string; qte: number; unite: string }[];
  totalColis: number;
  qrPayload?: string | null;
  nif?: string | null;
  stat?: string | null;
}

export interface FicheInventaireOpts {
  entrepriseNom: string;
  ficheCode: string;
  date: Date;
  depotNom?: string | null;
  lignes: { ref: string; nom: string; qteAttendue: number; unite: string }[];
}
```

---

### `src/lib/xprint/service.ts` — Orchestration

```typescript
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { xprintSend, xprintQueryOrder, buildDefaultConfig, xprintErrorMessage, type XprintConfig } from "./client";

// Charge la config depuis la table entreprise (adapter selon votre schéma)
export async function loadXprintConfig(): Promise<XprintConfig | null> {
  const rows = await db.select().from(schema.entreprise).limit(1);
  const e = rows[0];
  if (!e) return null;
  const p = (e.parametres ?? {}) as Record<string, unknown>;
  if (!p["xprintEnabled"]) return null;
  const user = String(p["xprintUser"] ?? "");
  const key  = String(p["xprintKey"]  ?? "");
  const sn   = String(p["xprintSn"]   ?? "");
  if (!user || !key || !sn) return null;
  return buildDefaultConfig({
    user, key, sn,
    baseUrl: p["xprintBaseUrl"] ? String(p["xprintBaseUrl"]) : undefined,
    copies: typeof p["xprintCopies"] === "number" ? p["xprintCopies"] : 1,
    voice:  typeof p["xprintVoice"]  === "number" ? p["xprintVoice"]  : 0,
    header: p["xprintHeader"] ? String(p["xprintHeader"]) : null,
    footer: p["xprintFooter"] ? String(p["xprintFooter"]) : null,
    autoOnFacture:         p["xprintAutoOnFacture"]         !== false,
    autoOnBonLivraison:    p["xprintAutoOnBonLivraison"]    === true,
    autoOnReceptionStock:  p["xprintAutoOnReceptionStock"]  === true,
  });
}

// Envoie + log en DB. Poll à 15s pour confirmer "printed" (spec Xpyun §6.3)
export async function sendPrintAndLog(
  content: string,
  meta: { kind: string; relatedId?: string | null; copies?: number },
): Promise<{ ok: boolean; orderId?: string; errorMessage?: string }> {
  const cfg = await loadXprintConfig();
  if (!cfg) return { ok: false, errorMessage: "Imprimante non configurée" };
  if (Buffer.byteLength(content, "utf-8") > 4096)
    return { ok: false, errorMessage: "Contenu > 4096 bytes" };

  const copies = meta.copies ?? cfg.copies;
  const res = await xprintSend(cfg, content, copies);

  const logId = `pl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await db.insert(schema.printLogs).values({
    id: logId,
    sn: cfg.sn,
    kind: meta.kind,
    relatedId: meta.relatedId ?? null,
    content: content.slice(0, 500),
    copies,
    status: res.ok ? "pending" : "failed",
    orderId: res.orderId ?? null,
    error: res.ok ? null : `[${res.code}] ${xprintErrorMessage(res.code, res.msg)}`,
    failedAt: res.ok ? null : new Date(),
  });

  if (res.ok && res.orderId) {
    const orderId = res.orderId;
    setTimeout(() => {
      xprintQueryOrder(cfg, orderId).then((done) => {
        if (done) {
          db.update(schema.printLogs)
            .set({ status: "printed" })
            .where(and(eq(schema.printLogs.id, logId), eq(schema.printLogs.status, "pending")))
            .catch(() => {});
        }
      }).catch(() => {});
    }, 15_000);
  }

  return { ok: res.ok, orderId: res.orderId, errorMessage: res.ok ? undefined : xprintErrorMessage(res.code, res.msg) };
}

// Rafraîchit manuellement les statuts "pending"
export async function refreshPendingLogs(): Promise<{ checked: number; updated: number }> {
  const cfg = await loadXprintConfig();
  if (!cfg) return { checked: 0, updated: 0 };
  const pending = await db
    .select({ id: schema.printLogs.id, orderId: schema.printLogs.orderId })
    .from(schema.printLogs)
    .where(eq(schema.printLogs.status, "pending"))
    .limit(100);
  const withOrderId = pending.filter((l) => l.orderId);
  let updated = 0;
  for (const log of withOrderId) {
    const done = await xprintQueryOrder(cfg, log.orderId!).catch(() => false);
    if (done) {
      await db.update(schema.printLogs)
        .set({ status: "printed" })
        .where(and(eq(schema.printLogs.id, log.id), eq(schema.printLogs.status, "pending")))
        .catch(() => {});
      updated++;
    }
  }
  return { checked: withOrderId.length, updated };
}
```

---

### `src/lib/print/escpos.ts` — Driver WebUSB ESC/POS (fallback USB)

```typescript
// Uniquement côté navigateur (import dynamique dans le composant client)
const ESC = 0x1b;
const GS  = 0x1d;

export interface PrinterDevice {
  device: USBDevice;
  endpointOut: number;
  interfaceNumber: number;
}

export interface TicketData {
  nomEntreprise: string;
  adresseEntreprise: string;
  nif?: string;
  stat?: string;
  numero: string;
  date: string;
  caissier: string;
  client?: string;
  lignes: { nom: string; qte: number; unite: string; prix: number; total: number }[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  modePaiement: string;
  montantRecu?: number;
  monnaie?: number;
  assujettieTV: boolean;
  merci?: string;
}

export async function connectPrinter(): Promise<PrinterDevice> {
  if (!navigator.usb) throw new Error("WebUSB non disponible dans ce navigateur");
  const device = await navigator.usb.requestDevice({ filters: [] });
  await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);
  const iface = device.configurations[0]?.interfaces[0];
  if (!iface) throw new Error("Interface USB introuvable");
  await device.claimInterface(iface.interfaceNumber);
  const epOut = iface.alternate.endpoints.find((ep) => ep.direction === "out");
  if (!epOut) throw new Error("Endpoint OUT introuvable");
  return { device, endpointOut: epOut.endpointNumber, interfaceNumber: iface.interfaceNumber };
}

export async function releasePrinter(printer: PrinterDevice): Promise<void> {
  try {
    await printer.device.releaseInterface(printer.interfaceNumber);
    await printer.device.close();
  } catch { /* ignore */ }
}
```

> **Note WebUSB** : nécessite HTTPS et un geste utilisateur (click). Chrome/Edge uniquement (pas Safari/Firefox). À importer en **dynamic import** dans le composant pour éviter l'erreur SSR.

---

## API Routes

### `POST /api/print/ticket` — Imprimer une facture

Corps JSON :
```json
{
  "numero": "FAC-2024-0001",
  "client": "Épicerie Rasoamanarivo",
  "lignes": [
    { "nom": "Riz Makalioka", "qte": 10, "unite": "kg", "prix": 2800, "total": 28000 }
  ],
  "totalHT": 28000,
  "totalTVA": 0,
  "totalTTC": 28000,
  "modePaiement": "Especes",
  "assujettieTV": false,
  "commandeId": "cmd_abc123"
}
```

Réponse :
```json
{ "ok": true, "orderId": "xp_order_xyz" }
// ou
{ "ok": false, "errorMessage": "Signature invalide (vérifier User et UserKEY)" }
```

---

### `GET /api/print/status` — Statut imprimante

```json
{ "configured": true, "sn": "XP-12345678", "online": true, "anomalie": false, "raw": 1 }
// ou
{ "configured": false }
```

**Codes `raw` Xpyun :**
- `1` — En ligne ✅
- `2` — Anomalie hardware ⚠️ (papier, tête…)
- `0` / autre — Hors ligne (file active) 🔴

---

### `POST /api/print/test` — Ticket de test

Aucun corps requis. Imprime un ticket demo avec données fictives.

---

### `POST /api/print/logs/refresh` — Rafraîchir les statuts pending

Aucun corps. Interroge Xpyun pour chaque log en statut `pending` et met à jour vers `printed`.

---

### `GET /api/admin/printer` — Lire la config

```json
{
  "enabled": true,
  "user": "mon_user",
  "key": "ma_cle",
  "sn": "XP-00000000",
  "baseUrl": "https://open.xpyun.net/api/openapi/xprinter",
  "copies": 1,
  "voice": 0,
  "header": "",
  "footer": "",
  "autoOnFacture": true,
  "autoOnBonLivraison": false,
  "autoOnReceptionStock": false
}
```

### `PUT /api/admin/printer` — Sauvegarder la config

Même format que GET. Valide avec Zod (copies 1-5, voice 0-15, baseUrl URL valide).

---

### `GET /api/admin/printer/logs` — Historique (50 derniers)

```json
[
  {
    "id": "pl_xxx",
    "kind": "facture",
    "status": "printed",
    "copies": 1,
    "orderId": "xp_order_yyy",
    "error": null,
    "createdAt": "2024-05-15T08:30:00Z"
  }
]
```

---

## Composant UI `PrinterSettings`

`"use client"` — à monter dans la page admin.

Fonctionnalités :
- Badge statut (En ligne / Hors ligne / Anomalie) avec refresh
- Toggle activer/désactiver Xpyun
- Formulaire credentials (User, UserKEY, SN, serveur)
- Copies (1-5), volume sonnerie (0-15)
- En-tête et pied de ticket personnalisés (textarea multilignes)
- Toggles impression automatique par événement
- Bouton "Ticket de test"
- Tableau des 50 derniers logs avec statuts colorés + auto-refresh 30s
- Bouton rafraîchir les statuts "pending"

**Montage dans l'admin :**
```tsx
import { PrinterSettings } from "@/components/domain/admin/printer-settings";

// Dans le JSX de votre page admin :
<PrinterSettings />
```

---

## Intégration dans la caisse POS

Pattern recommandé : **cloud d'abord, fallback WebUSB, fallback PDF**.

```typescript
// Dans le composant caisse (côté client) :
async function imprimerTicket() {
  // 1. Essayer le cloud Xpyun
  try {
    const res = await fetch("/api/print/ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero: commande.numero,
        client: commande.clientNom,
        lignes: commande.lignes.map((l) => ({
          nom: l.nom, qte: l.quantite, unite: l.unite, prix: l.prixUnitaire, total: l.total,
        })),
        totalHT: commande.totalHT,
        totalTVA: commande.totalTVA,
        totalTTC: commande.totalTTC,
        modePaiement: commande.modePaiement,
        assujettieTV: entreprise.assujettieTV,
        commandeId: commande.id,
      }),
    });
    const data = await res.json();
    if (data.ok) return; // Succès cloud → fin
  } catch { /* réseau hors ligne → continuer */ }

  // 2. Fallback WebUSB (import dynamique pour éviter erreur SSR)
  try {
    const { connectPrinter, printTicket, releasePrinter } = await import("@/lib/print/escpos");
    const printer = await connectPrinter();
    await printTicket(printer, {
      nomEntreprise: entreprise.nom,
      adresseEntreprise: entreprise.adresse ?? "",
      numero: commande.numero,
      date: new Date().toLocaleString("fr-MG"),
      caissier: session.user.name,
      lignes: commande.lignes.map((l) => ({ nom: l.nom, qte: l.quantite, unite: l.unite, prix: l.prixUnitaire, total: l.total })),
      totalHT: commande.totalHT,
      totalTVA: commande.totalTVA,
      totalTTC: commande.totalTTC,
      modePaiement: commande.modePaiement,
      assujettieTV: entreprise.assujettieTV,
    });
    await releasePrinter(printer);
    return;
  } catch { /* USB indisponible → continuer */ }

  // 3. Fallback PDF téléchargement
  const { genererFacturePDF, downloadPDF } = await import("@/lib/print/pdf-facture");
  const pdfBytes = await genererFacturePDF({ /* ... */ });
  downloadPDF(pdfBytes, `facture-${commande.numero}.pdf`);
}
```

---

## Checklist d'installation

### 1. Dépendances
```bash
pnpm add pdf-lib
pnpm add -D @types/w3c-web-usb
```

### 2. Fichiers à copier (ordre)
```
src/lib/xprint/client.ts
src/lib/xprint/format.ts
src/lib/xprint/service.ts        ← adapter loadXprintConfig() à votre schéma
src/lib/print/escpos.ts
src/lib/db/schema/xprint.ts
src/components/domain/admin/printer-settings.tsx
src/app/api/admin/printer/route.ts
src/app/api/admin/printer/logs/route.ts
src/app/api/print/ticket/route.ts
src/app/api/print/status/route.ts
src/app/api/print/test/route.ts
src/app/api/print/logs/refresh/route.ts
```

### 3. Migration DB
```bash
# Appliquer la migration print_logs
psql $DATABASE_URL < src/lib/db/migrations/0001_xprint.sql
# ou avec drizzle-kit :
pnpm drizzle-kit push
```

### 4. Adapter `loadXprintConfig()` si pas de table entreprise
Remplacer la lecture depuis `schema.entreprise` par votre table de settings.

### 5. Exporter `printLogs` depuis l'index schema
```typescript
// src/lib/db/schema/index.ts
export * from "./xprint";
```

### 6. Monter `<PrinterSettings />` dans votre page admin

### 7. Test end-to-end
1. Aller dans **Admin → Imprimante thermique**
2. Activer, renseigner User / UserKEY / SN
3. Cliquer **Ticket de test** → le ticket doit s'imprimer
4. Vérifier le log → statut `printed` après ~15s

---

## Codes d'erreur Xpyun à connaître

| Code | Cause | Solution |
|------|-------|----------|
| 1002 | Signature SHA1 invalide | Vérifier User et UserKEY — pas d'espace |
| 1003 | Timestamp trop décalé | Synchroniser l'horloge serveur (NTP) |
| 1006 | SN inconnu | Vérifier le SN gravé sous l'imprimante |
| 1007 | Contenu > 4096 bytes | Réduire le nombre de lignes du ticket |
| 1008 | Imprimante hors ligne | Normal si WiFi coupé — job mis en file |
| 1010 | Rate limit | Réessayer dans quelques secondes |

---

*Document généré depuis le projet GrossistePPN Madagascar — Mai 2026*
