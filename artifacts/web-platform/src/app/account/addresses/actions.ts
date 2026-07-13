"use server";

/**
 * VEDIC HEMP — ADDRESS BOOK ACTIONS (§1.3)
 *
 * Same validation contract as checkout (§0.6): the server is the authority
 * on what a deliverable address looks like; the form is just the input.
 */

import { redirect } from "next/navigation";
import { readAddresses, validateAddressFields, writeAddresses, type StoredAddress } from "@/lib/engage";

const KINDS = ["HOME", "WORK", "OTHER"];

export async function addAddress(formData: FormData): Promise<void> {
  const fields = {
    name: String(formData.get("name") ?? "").trim(),
    mobile: String(formData.get("mobile") ?? "").trim(),
    line1: String(formData.get("line1") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    state: String(formData.get("state") ?? "").trim(),
    pincode: String(formData.get("pincode") ?? "").trim(),
  };
  const kind = String(formData.get("kind") ?? "HOME");
  const makeDefault = formData.get("makeDefault") === "on";

  const err = validateAddressFields(fields);
  if (err) redirect(`/account/addresses?err=${err}#add`);
  if (!KINDS.includes(kind)) redirect("/account/addresses?err=kind#add");

  const list = await readAddresses();
  if (list.length >= 6) redirect("/account/addresses?err=limit#add");
  const entry: StoredAddress = {
    id: `ad-${Date.now().toString(36)}`,
    ...fields,
    kind,
    isDefault: makeDefault || list.length === 0,
  };
  const next = entry.isDefault ? list.map((a) => ({ ...a, isDefault: false })) : list;
  await writeAddresses([entry, ...next]);
  redirect("/account/addresses?ok=added");
}

export async function deleteAddress(formData: FormData): Promise<void> {
  const id = String(formData.get("addressId") ?? "").slice(0, 20);
  await writeAddresses((await readAddresses()).filter((a) => a.id !== id));
  redirect("/account/addresses?ok=deleted");
}

export async function setDefaultAddress(formData: FormData): Promise<void> {
  const id = String(formData.get("addressId") ?? "").slice(0, 20);
  const list = await readAddresses();
  if (!list.some((a) => a.id === id)) redirect("/account/addresses");
  await writeAddresses(list.map((a) => ({ ...a, isDefault: a.id === id })));
  redirect("/account/addresses?ok=default");
}
