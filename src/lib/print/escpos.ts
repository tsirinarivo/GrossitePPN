/**
 * ESC/POS WebUSB — impression ticket thermique 80mm
 * Fonctionne avec imprimantes USB compatibles ESC/POS (Epson, Bixolon, Rongta…)
 *
 * Usage :
 *   const printer = await connectPrinter();
 *   await printTicket(printer, data);
 *   await printer.device.releaseInterface(0);
 */

const ESC = 0x1b;
const GS = 0x1d;

const CMD = {
  INIT: [ESC, 0x40],
  ALIGN_CENTER: [ESC, 0x61, 0x01],
  ALIGN_LEFT: [ESC, 0x61, 0x00],
  ALIGN_RIGHT: [ESC, 0x61, 0x02],
  BOLD_ON: [ESC, 0x45, 0x01],
  BOLD_OFF: [ESC, 0x45, 0x00],
  DOUBLE_HEIGHT: [ESC, 0x21, 0x10],
  NORMAL_SIZE: [ESC, 0x21, 0x00],
  CUT: [GS, 0x56, 0x41, 0x10],
  LF: [0x0a],
} as const;

export interface PrinterDevice {
  device: USBDevice;
  endpointOut: number;
  interfaceNumber: number;
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

function encodeText(text: string): Uint8Array {
  // ISO-8859-1 approximation (imprimantes thermiques PPN)
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes[i] = code < 256 ? code : 0x3f; // '?' pour caractères non-latin
  }
  return bytes;
}

function concat(...arrays: (readonly number[] | number[] | Uint8Array)[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function line(text: string): Uint8Array {
  return concat(encodeText(text), CMD.LF);
}

function separator(char = "-", width = 32): Uint8Array {
  return line(char.repeat(width));
}

function padded(left: string, right: string, width = 32): Uint8Array {
  const spaces = Math.max(1, width - left.length - right.length);
  return line(left + " ".repeat(spaces) + right);
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

export async function printTicket(printer: PrinterDevice, data: TicketData): Promise<void> {
  const { device, endpointOut } = printer;
  const fmt = (n: number) => `${n.toLocaleString("fr-FR")} Ar`;

  const blocks: Uint8Array[] = [
    new Uint8Array(CMD.INIT),
    new Uint8Array(CMD.ALIGN_CENTER),
    new Uint8Array(CMD.BOLD_ON),
    new Uint8Array(CMD.DOUBLE_HEIGHT),
    line(data.nomEntreprise),
    new Uint8Array(CMD.NORMAL_SIZE),
    line(data.adresseEntreprise),
    data.nif ? line(`NIF: ${data.nif}`) : new Uint8Array(0),
    data.stat ? line(`STAT: ${data.stat}`) : new Uint8Array(0),
    new Uint8Array(CMD.BOLD_OFF),
    new Uint8Array(CMD.LF),
    new Uint8Array(CMD.ALIGN_LEFT),
    separator(),
    line(`FACTURE ${data.numero}`),
    line(`Date : ${data.date}`),
    line(`Caissier : ${data.caissier}`),
    data.client ? line(`Client : ${data.client}`) : new Uint8Array(0),
    separator(),
    new Uint8Array(CMD.LF),
    ...data.lignes.map((l) => concat(
      line(`${l.nom} (${l.unite})`),
      padded(`  ${l.qte} x ${fmt(l.prix)}`, fmt(l.total))
    )),
    new Uint8Array(CMD.LF),
    separator(),
    padded("TOTAL HT", fmt(data.totalHT)),
    data.assujettieTV ? padded(`TVA`, fmt(data.totalTVA)) : new Uint8Array(0),
    new Uint8Array(CMD.BOLD_ON),
    padded("TOTAL TTC", fmt(data.totalTTC)),
    new Uint8Array(CMD.BOLD_OFF),
    separator(),
    padded("Paiement", data.modePaiement.toUpperCase()),
    data.montantRecu != null ? padded("Recu", fmt(data.montantRecu)) : new Uint8Array(0),
    data.monnaie != null ? padded("Monnaie", fmt(data.monnaie)) : new Uint8Array(0),
    separator(),
    new Uint8Array(CMD.ALIGN_CENTER),
    line(data.merci ?? "Misaotra - Merci !"),
    line("GrossistePPN Madagascar"),
    new Uint8Array(CMD.LF),
    new Uint8Array(CMD.LF),
    new Uint8Array(CMD.CUT),
  ];

  const payload = concat(...blocks);
  await device.transferOut(endpointOut, payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength) as ArrayBuffer);
}

export async function releasePrinter(printer: PrinterDevice): Promise<void> {
  try {
    await printer.device.releaseInterface(printer.interfaceNumber);
    await printer.device.close();
  } catch {
    // Ignorer les erreurs de libération
  }
}
