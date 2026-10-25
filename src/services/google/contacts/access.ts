// Credentials are in-memory only and bound to both the Keepl owner and Google account.
export type ContactsAccess = {
  ownerId: string;
  accountId: string;
  accessToken: string;
  expiresAt: number;
};
let owner: string | null = null;
let access: ContactsAccess | null = null;
let revision = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
export const contactsSnapshot = () => revision;
export function subscribeContacts(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function clearContactsAccess() {
  access = null;
  clearTimeout(timer);
  revision++;
  listeners.forEach((l) => l());
}
export function setContactsOwner(id: string | null) {
  if (owner !== id) {
    owner = id;
    clearContactsAccess();
  }
}
export function saveContactsAccess(
  next: ContactsAccess,
  expectedRevision: number,
) {
  if (
    next.ownerId !== owner ||
    expectedRevision !== revision ||
    next.expiresAt <= Date.now()
  )
    throw new Error("contacts-access");
  clearContactsAccess();
  access = next;
  timer = setTimeout(clearContactsAccess, next.expiresAt - Date.now());
  revision++;
  listeners.forEach((l) => l());
}
export function getContactsAccess(ownerId: string) {
  if (
    !access ||
    access.ownerId !== ownerId ||
    owner !== ownerId ||
    access.expiresAt <= Date.now()
  )
    throw new Error("contacts-access");
  return access;
}
export function assertContactsAccess(expected: ContactsAccess) {
  if (getContactsAccess(expected.ownerId) !== expected)
    throw new Error("contacts-access");
}
