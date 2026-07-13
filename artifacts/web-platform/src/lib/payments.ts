/**
 * VEDIC HEMP — PAYMENT METHODS (admin-configured)
 *
 * Which payment methods exist at checkout is an ADMIN decision, not code:
 * every method can be switched on/off and its checkout copy edited from
 * Admin → Finance → Payments, including Cash on Delivery. The launch
 * default is prepaid-only (COD off), but that is a setting, not a rule.
 *
 * The server-side whitelist in placeOrder() is derived from this store —
 * enabling a method here is the ONLY way it becomes accepted, and a forged
 * value for a disabled method is rejected no matter what the client sends.
 */

export interface PaymentMethodDef {
  key: string;
  label: string;
  sub: string;
  kind: "prepaid" | "cod";
  defaultEnabled: boolean;
}

export const PAYMENT_DEFS: PaymentMethodDef[] = [
  { key: "upi", label: "UPI", sub: "GPay, PhonePe, Paytm — pay on the next screen", kind: "prepaid", defaultEnabled: true },
  { key: "card", label: "Card", sub: "Credit or debit · processed by a PCI-DSS gateway, card data never touches Vedic Hemp", kind: "prepaid", defaultEnabled: true },
  { key: "netbanking", label: "Netbanking", sub: "All major Indian banks — redirected to your bank to authorise", kind: "prepaid", defaultEnabled: true },
  { key: "wallet", label: "Wallet & gift credit", sub: "Pay with your Vedic Hemp wallet balance and gift cards", kind: "prepaid", defaultEnabled: false },
  { key: "emi", label: "EMI", sub: "3–12 month instalments on major cards, above ₹3,000", kind: "prepaid", defaultEnabled: false },
  { key: "cod", label: "Cash on Delivery", sub: "Pay the courier when your order arrives · ID checked on 21+ items", kind: "cod", defaultEnabled: false },
];

export const GATEWAYS = ["razorpay", "phonepe", "cashfree", "stripe"] as const;
export type Gateway = (typeof GATEWAYS)[number];

export interface PaymentMethod extends PaymentMethodDef {
  enabled: boolean;
}

interface Override {
  enabled?: boolean;
  label?: string;
  sub?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __vhPayments: Record<string, Override> | undefined;
  // eslint-disable-next-line no-var
  var __vhGateway: Gateway | undefined;
}

function store(): Record<string, Override> {
  globalThis.__vhPayments ??= {};
  return globalThis.__vhPayments;
}

export async function readPaymentMethods(): Promise<PaymentMethod[]> {
  return PAYMENT_DEFS.map((d) => {
    const o = store()[d.key] ?? {};
    return { ...d, enabled: o.enabled ?? d.defaultEnabled, label: o.label || d.label, sub: o.sub || d.sub };
  });
}

export async function readEnabledPayments(): Promise<PaymentMethod[]> {
  return (await readPaymentMethods()).filter((m) => m.enabled);
}

export async function writePaymentMethod(key: string, o: Override): Promise<void> {
  if (!PAYMENT_DEFS.some((d) => d.key === key)) return;
  store()[key] = { ...store()[key], ...o };
}

export async function readGateway(): Promise<Gateway> {
  return globalThis.__vhGateway ?? "razorpay";
}
export async function writeGateway(g: string): Promise<boolean> {
  if (!GATEWAYS.includes(g as Gateway)) return false;
  globalThis.__vhGateway = g as Gateway;
  return true;
}

export async function codEnabled(): Promise<boolean> {
  return (await readEnabledPayments()).some((m) => m.kind === "cod");
}
