import * as local from "@/lib/local-db";

export type { PaymentRequest, BusinessOperation, BusinessWallet, BusinessContact, BusinessBankAccount, BusinessIntegration, ComplianceRecord } from "@/lib/local-db";

type RemoteMethod =
  | "listOperations" | "getOperation" | "updateOperation" | "addOperationEvent" | "getOperationEvents"
  | "createOperation" | "listIntegrations" | "createIntegration" | "listBankAccounts"
  | "createBankAccount" | "listContacts" | "createContact" | "listWallets" | "createWallet"
  | "getRequest" | "listRequests" | "createRequest" | "updateStatus" | "addEvent"
  | "getEvents" | "listComplianceRecords";

async function remote<T>(method: RemoteMethod, input: Record<string, unknown> = {}): Promise<T> {
  const url = process.env.FOLIO_DATA_API_URL;
  const token = process.env.FOLIO_DATA_API_TOKEN;
  if (!url || !token) throw new Error("Folio data service is not configured.");
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: "data", method, input }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as { data?: T; error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Folio data service is unavailable.");
  return payload.data as T;
}

const cloudEnabled = () => Boolean(process.env.FOLIO_DATA_API_URL && process.env.FOLIO_DATA_API_TOKEN);
const maybeStringifyEvents = <T extends { payload: unknown }[]>(events: T) => events.map((event) => ({ ...event, payload: typeof event.payload === "string" ? event.payload : JSON.stringify(event.payload) })) as T;

export async function listOperations() { return cloudEnabled() ? remote<local.BusinessOperation[]>("listOperations") : local.listOperations(); }
export async function getOperation(id: string) { return cloudEnabled() ? remote<local.BusinessOperation | null>("getOperation", { id }) : local.getOperation(id); }
export async function updateOperation(id: string, status: string, details: Parameters<typeof local.updateOperation>[2] = {}) { return cloudEnabled() ? remote<local.BusinessOperation | null>("updateOperation", { id, status, details }) : local.updateOperation(id, status, details); }
export async function addOperationEvent(operationId: string, type: string, payload: object) { return cloudEnabled() ? remote<null>("addOperationEvent", { operationId, type, payload }) : local.addOperationEvent(operationId, type, payload); }
export async function getOperationEvents(operationId: string) { return cloudEnabled() ? maybeStringifyEvents(await remote<Awaited<ReturnType<typeof local.getOperationEvents>>>("getOperationEvents", { operationId })) : local.getOperationEvents(operationId); }
export async function createOperation(input: Parameters<typeof local.createOperation>[0]) { return cloudEnabled() ? remote<local.BusinessOperation>("createOperation", input) : local.createOperation(input); }

export async function listIntegrations() { return cloudEnabled() ? remote<local.BusinessIntegration[]>("listIntegrations") : local.listIntegrations(); }
export async function createIntegration(input: Parameters<typeof local.createIntegration>[0]) { return cloudEnabled() ? remote<ReturnType<typeof local.createIntegration>>("createIntegration", input) : local.createIntegration(input); }
export async function listBankAccounts() { return cloudEnabled() ? remote<local.BusinessBankAccount[]>("listBankAccounts") : local.listBankAccounts(); }
export async function createBankAccount(input: Parameters<typeof local.createBankAccount>[0]) { return cloudEnabled() ? remote<local.BusinessBankAccount>("createBankAccount", input) : local.createBankAccount(input); }
export async function listContacts() { return cloudEnabled() ? remote<local.BusinessContact[]>("listContacts") : local.listContacts(); }
export async function createContact(input: Parameters<typeof local.createContact>[0]) { return cloudEnabled() ? remote<local.BusinessContact>("createContact", input) : local.createContact(input); }
export async function listWallets() { return cloudEnabled() ? remote<local.BusinessWallet[]>("listWallets") : local.listWallets(); }
export async function createWallet(input: Parameters<typeof local.createWallet>[0]) { return cloudEnabled() ? remote<local.BusinessWallet>("createWallet", input) : local.createWallet(input); }

export async function getRequest(id: string) { return cloudEnabled() ? remote<local.PaymentRequest | null>("getRequest", { id }) : local.getRequest(id); }
export async function listRequests() { return cloudEnabled() ? remote<local.PaymentRequest[]>("listRequests") : local.listRequests(); }
export async function createRequest(input: Parameters<typeof local.createRequest>[0]) { return cloudEnabled() ? remote<local.PaymentRequest>("createRequest", input) : local.createRequest(input); }
export async function updateStatus(id: string, status: string, details: Parameters<typeof local.updateStatus>[2] = {}) { return cloudEnabled() ? remote<local.PaymentRequest | null>("updateStatus", { id, status, details }) : local.updateStatus(id, status, details); }
export async function addEvent(requestId: string, type: string, payload: object) { return cloudEnabled() ? remote<null>("addEvent", { requestId, type, payload }) : local.addEvent(requestId, type, payload); }
export async function getEvents(requestId: string) { return cloudEnabled() ? maybeStringifyEvents(await remote<Awaited<ReturnType<typeof local.getEvents>>>("getEvents", { requestId })) : local.getEvents(requestId); }
export async function listComplianceRecords() { return cloudEnabled() ? remote<local.ComplianceRecord[]>("listComplianceRecords") : local.listComplianceRecords(); }
