import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

export type PaymentRequest = {
  id: string;
  business_name: string;
  reference_id: string;
  description: string;
  amount: string;
  settlement_asset: string;
  settlement_chain: string;
  status: string;
  hosted_url: string;
  created_at: string;
  source_chain: string | null;
  source_tx: string | null;
  near_tx: string | null;
  destination_tx: string | null;
  channel: string | null;
  merchant_wallet_id: string | null;
};

const dataDirectory = path.join(process.cwd(), "data");
const databasePath = path.join(dataDirectory, "settlement-router.db");
const sql = (statement: string) => execFileSync("/usr/bin/sqlite3", [databasePath, statement], { encoding: "utf8" });
const escape = (value: string) => value.replaceAll("'", "''");

function initialize() {
  if (!existsSync(dataDirectory)) mkdirSync(dataDirectory, { recursive: true });
  sql(`CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY, business_name TEXT NOT NULL, reference_id TEXT NOT NULL,
    description TEXT NOT NULL, amount TEXT NOT NULL, settlement_asset TEXT NOT NULL,
    settlement_chain TEXT NOT NULL, status TEXT NOT NULL, hosted_url TEXT NOT NULL,
    created_at TEXT NOT NULL, source_chain TEXT, source_tx TEXT, destination_tx TEXT
  );
  CREATE TABLE IF NOT EXISTS payment_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, request_id TEXT NOT NULL, type TEXT NOT NULL,
    payload TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS business_operations (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, recipient TEXT NOT NULL, amount TEXT NOT NULL,
    asset TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS business_wallets (
    id TEXT PRIMARY KEY, label TEXT NOT NULL, address TEXT NOT NULL, network TEXT NOT NULL,
    role TEXT NOT NULL, note TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS business_contacts (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, destination TEXT NOT NULL,
    network TEXT NOT NULL, email TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS business_bank_accounts (
    id TEXT PRIMARY KEY, nickname TEXT NOT NULL, bank_name TEXT NOT NULL,
    account_last_four TEXT NOT NULL, country TEXT NOT NULL, currency TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS business_integrations (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL,
    key_prefix TEXT NOT NULL, webhook_url TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS operation_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, operation_id TEXT NOT NULL, type TEXT NOT NULL,
    payload TEXT NOT NULL, created_at TEXT NOT NULL
  );
  INSERT OR IGNORE INTO payment_requests (id,business_name,reference_id,description,amount,settlement_asset,settlement_chain,status,hosted_url,created_at,source_chain,source_tx,destination_tx) VALUES
    ('NG-1043','Nook Goods','NG-1043','Studio mug, matte sand','20.00','USDC','Base','awaiting_payment','/pay/NG-1043','2026-11-09T08:00:00.000Z',NULL,NULL,NULL),
    ('POS-1042','Nook Goods','1042','Studio mug, gift wrap, local delivery','20.00','USDC','Base','awaiting_payment','/pay/POS-1042','2026-11-09T08:00:00.000Z',NULL,NULL,NULL);
  INSERT OR IGNORE INTO business_bank_accounts (id,nickname,bank_name,account_last_four,country,currency,created_at)
    VALUES ('demo_cpn_usd','Operating account (demo)','Example Bank','4826','US','USD','2026-11-09T08:00:00.000Z');`);
  // Lightweight local migration for existing demo databases.
  const existingColumns = new Set((JSON.parse(execFileSync("/usr/bin/sqlite3", ["-json", databasePath, "PRAGMA table_info(business_operations);"], { encoding: "utf8" }) || "[]") as Array<{ name: string }>).map((column) => column.name));
  for (const [name, statement] of [
    ["recipient_address", "ALTER TABLE business_operations ADD COLUMN recipient_address TEXT"],
    ["network", "ALTER TABLE business_operations ADD COLUMN network TEXT"],
    ["reference", "ALTER TABLE business_operations ADD COLUMN reference TEXT"],
    ["source_wallet_id", "ALTER TABLE business_operations ADD COLUMN source_wallet_id TEXT"],
    ["tx_hash", "ALTER TABLE business_operations ADD COLUMN tx_hash TEXT"],
    ["provider_reference", "ALTER TABLE business_operations ADD COLUMN provider_reference TEXT"],
    ["bank_account_id", "ALTER TABLE business_operations ADD COLUMN bank_account_id TEXT"],
    ["near_tx", "ALTER TABLE business_operations ADD COLUMN near_tx TEXT"],
    ["destination_tx", "ALTER TABLE business_operations ADD COLUMN destination_tx TEXT"],
    ["deposit_address", "ALTER TABLE business_operations ADD COLUMN deposit_address TEXT"],
    ["route_status", "ALTER TABLE business_operations ADD COLUMN route_status TEXT"],
  ]) if (!existingColumns.has(name)) sql(statement);
  const walletColumns = new Set((JSON.parse(execFileSync("/usr/bin/sqlite3", ["-json", databasePath, "PRAGMA table_info(business_wallets);"], { encoding: "utf8" }) || "[]") as Array<{ name: string }>).map((column) => column.name));
  if (!walletColumns.has("note")) sql("ALTER TABLE business_wallets ADD COLUMN note TEXT NOT NULL DEFAULT ''");
  const requestColumns = new Set((JSON.parse(execFileSync("/usr/bin/sqlite3", ["-json", databasePath, "PRAGMA table_info(payment_requests);"], { encoding: "utf8" }) || "[]") as Array<{ name: string }>).map((column) => column.name));
  if (!requestColumns.has("channel")) sql("ALTER TABLE payment_requests ADD COLUMN channel TEXT DEFAULT 'pos'");
  if (!requestColumns.has("merchant_wallet_id")) sql("ALTER TABLE payment_requests ADD COLUMN merchant_wallet_id TEXT");
  if (!requestColumns.has("near_tx")) sql("ALTER TABLE payment_requests ADD COLUMN near_tx TEXT");
}

export type BusinessOperation = { id: string; kind: string; recipient: string; recipient_address: string | null; network: string | null; reference: string | null; source_wallet_id: string | null; bank_account_id: string | null; tx_hash: string | null; near_tx: string | null; destination_tx: string | null; deposit_address: string | null; route_status: string | null; provider_reference: string | null; amount: string; asset: string; status: string; created_at: string };

export function listOperations() {
  initialize();
  const output = execFileSync("/usr/bin/sqlite3", ["-json", databasePath, "SELECT * FROM business_operations ORDER BY created_at DESC;"], { encoding: "utf8" });
  return JSON.parse(output || "[]") as BusinessOperation[];
}

export function getOperation(id: string) {
  initialize();
  const output = execFileSync("/usr/bin/sqlite3", ["-json", databasePath, `SELECT * FROM business_operations WHERE id='${escape(id)}' LIMIT 1;`], { encoding: "utf8" });
  return (JSON.parse(output || "[]") as BusinessOperation[])[0] ?? null;
}

export function updateOperation(id: string, status: string, details: { txHash?: string; nearTx?: string; destinationTx?: string; depositAddress?: string; routeStatus?: string; providerReference?: string } = {}) {
  initialize();
  const assignments = [`status='${escape(status)}'`];
  if (details.txHash) assignments.push(`tx_hash='${escape(details.txHash)}'`);
  if (details.nearTx) assignments.push(`near_tx='${escape(details.nearTx)}'`);
  if (details.destinationTx) assignments.push(`destination_tx='${escape(details.destinationTx)}'`);
  if (details.depositAddress) assignments.push(`deposit_address='${escape(details.depositAddress)}'`);
  if (details.routeStatus) assignments.push(`route_status='${escape(details.routeStatus)}'`);
  if (details.providerReference) assignments.push(`provider_reference='${escape(details.providerReference)}'`);
  sql(`UPDATE business_operations SET ${assignments.join(",")} WHERE id='${escape(id)}';`);
  return getOperation(id);
}

export function addOperationEvent(operationId: string, type: string, payload: object) {
  initialize();
  sql(`INSERT INTO operation_events (operation_id,type,payload,created_at) VALUES ('${escape(operationId)}','${escape(type)}','${escape(JSON.stringify(payload))}','${new Date().toISOString()}');`);
}

export function getOperationEvents(operationId: string) {
  initialize();
  const output = execFileSync("/usr/bin/sqlite3", ["-json", databasePath, `SELECT * FROM operation_events WHERE operation_id='${escape(operationId)}' ORDER BY id DESC;`], { encoding: "utf8" });
  return JSON.parse(output || "[]") as Array<{ id: number; operation_id: string; type: string; payload: string; created_at: string }>;
}

export function createOperation(input: Pick<BusinessOperation, "kind" | "recipient" | "recipient_address" | "network" | "reference" | "source_wallet_id" | "bank_account_id" | "amount" | "asset" | "status">) {
  initialize();
  const id = `op_${Date.now().toString(36)}`;
  const createdAt = new Date().toISOString();
  sql(`INSERT INTO business_operations (id,kind,recipient,recipient_address,network,reference,source_wallet_id,bank_account_id,amount,asset,status,created_at) VALUES ('${escape(id)}','${escape(input.kind)}','${escape(input.recipient)}','${escape(input.recipient_address ?? "")}','${escape(input.network ?? "")}','${escape(input.reference ?? "")}','${escape(input.source_wallet_id ?? "")}','${escape(input.bank_account_id ?? "")}','${escape(input.amount)}','${escape(input.asset)}','${escape(input.status)}','${escape(createdAt)}');`);
  return listOperations()[0];
}

export type BusinessWallet = { id: string; label: string; address: string; network: string; role: string; note: string; created_at: string };
export type BusinessContact = { id: string; name: string; type: string; destination: string; network: string; email: string; created_at: string };
export type BusinessBankAccount = { id: string; nickname: string; bank_name: string; account_last_four: string; country: string; currency: string; created_at: string };
export type BusinessIntegration = { id: string; name: string; type: "online_checkout" | "pos_sdk"; status: "active"; key_prefix: string; webhook_url: string; created_at: string };
export function listIntegrations() { initialize(); const output = execFileSync("/usr/bin/sqlite3", ["-json", databasePath, "SELECT * FROM business_integrations ORDER BY created_at DESC;"], { encoding: "utf8" }); return JSON.parse(output || "[]") as BusinessIntegration[]; }
export function createIntegration(input: Pick<BusinessIntegration, "name" | "type" | "webhook_url">) { initialize(); const id = `int_${Date.now().toString(36)}`; const createdAt = new Date().toISOString(); const keyPrefix = `folio_sk_test_${Math.random().toString(36).slice(2, 10)}`; sql(`INSERT INTO business_integrations (id,name,type,status,key_prefix,webhook_url,created_at) VALUES ('${escape(id)}','${escape(input.name)}','${escape(input.type)}','active','${escape(keyPrefix)}','${escape(input.webhook_url)}','${escape(createdAt)}');`); return { integration: listIntegrations()[0], secret: `${keyPrefix}_${Math.random().toString(36).slice(2, 18)}` }; }
export function listBankAccounts() { initialize(); const output = execFileSync("/usr/bin/sqlite3", ["-json", databasePath, "SELECT * FROM business_bank_accounts ORDER BY created_at DESC;"], { encoding: "utf8" }); return JSON.parse(output || "[]") as BusinessBankAccount[]; }
export function createBankAccount(input: Pick<BusinessBankAccount, "nickname" | "bank_name" | "account_last_four" | "country" | "currency">) { initialize(); const id = `bank_${Date.now().toString(36)}`; const createdAt = new Date().toISOString(); sql(`INSERT INTO business_bank_accounts (id,nickname,bank_name,account_last_four,country,currency,created_at) VALUES ('${escape(id)}','${escape(input.nickname)}','${escape(input.bank_name)}','${escape(input.account_last_four)}','${escape(input.country)}','${escape(input.currency)}','${escape(createdAt)}');`); return listBankAccounts()[0]; }
export function listContacts() { initialize(); const output = execFileSync("/usr/bin/sqlite3", ["-json", databasePath, "SELECT * FROM business_contacts ORDER BY created_at DESC;"], { encoding: "utf8" }); return JSON.parse(output || "[]") as BusinessContact[]; }
export function createContact(input: Pick<BusinessContact, "name" | "type" | "destination" | "network" | "email">) { initialize(); const id = "contact_" + Date.now().toString(36); const createdAt = new Date().toISOString(); sql("INSERT INTO business_contacts (id,name,type,destination,network,email,created_at) VALUES ('" + escape(id) + "','" + escape(input.name) + "','" + escape(input.type) + "','" + escape(input.destination) + "','" + escape(input.network) + "','" + escape(input.email) + "','" + escape(createdAt) + "');"); return listContacts()[0]; }
export function listWallets() { initialize(); const output = execFileSync("/usr/bin/sqlite3", ["-json", databasePath, "SELECT * FROM business_wallets ORDER BY created_at DESC;"], { encoding: "utf8" }); return JSON.parse(output || "[]") as BusinessWallet[]; }
export function createWallet(input: Pick<BusinessWallet, "label" | "address" | "network" | "role" | "note">) { initialize(); const id = `wallet_${Date.now().toString(36)}`; const createdAt = new Date().toISOString(); sql(`INSERT INTO business_wallets (id,label,address,network,role,note,created_at) VALUES ('${escape(id)}','${escape(input.label)}','${escape(input.address)}','${escape(input.network)}','${escape(input.role)}','${escape(input.note)}','${escape(createdAt)}');`); return listWallets()[0]; }

export function getRequest(id: string) {
  initialize();
  const output = execFileSync("/usr/bin/sqlite3", ["-json", databasePath, `SELECT * FROM payment_requests WHERE id='${escape(id)}' LIMIT 1;`], { encoding: "utf8" });
  return (JSON.parse(output || "[]") as PaymentRequest[])[0] ?? null;
}

export function listRequests() {
  initialize();
  const output = execFileSync("/usr/bin/sqlite3", ["-json", databasePath, "SELECT * FROM payment_requests ORDER BY created_at DESC;"], { encoding: "utf8" });
  return JSON.parse(output || "[]") as PaymentRequest[];
}

export function createRequest(input: Pick<PaymentRequest, "id" | "business_name" | "reference_id" | "description" | "amount" | "settlement_asset" | "settlement_chain"> & { channel?: string; merchant_wallet_id?: string | null }) {
  initialize();
  const hostedUrl = `/pay/${input.id}`;
  const createdAt = new Date().toISOString();
  const values = [input.id, input.business_name, input.reference_id, input.description, input.amount, input.settlement_asset, input.settlement_chain, "awaiting_payment", hostedUrl, createdAt].map((value) => `'${escape(value)}'`).join(",");
  sql(`INSERT INTO payment_requests (id,business_name,reference_id,description,amount,settlement_asset,settlement_chain,status,hosted_url,created_at,channel,merchant_wallet_id) VALUES (${values},'${escape(input.channel ?? "pos")}','${escape(input.merchant_wallet_id ?? "")}');`);
  addEvent(input.id, "payment_request.created", { source: input.channel ?? "pos", merchantWalletId: input.merchant_wallet_id ?? null });
  return getRequest(input.id)!;
}

export function updateStatus(id: string, status: string, details: { sourceChain?: string; sourceTx?: string; nearTx?: string; destinationTx?: string } = {}) {
  initialize();
  const assignments = [`status='${escape(status)}'`];
  if (details.sourceChain) assignments.push(`source_chain='${escape(details.sourceChain)}'`);
  if (details.sourceTx) assignments.push(`source_tx='${escape(details.sourceTx)}'`);
  if (details.nearTx) assignments.push(`near_tx='${escape(details.nearTx)}'`);
  if (details.destinationTx) assignments.push(`destination_tx='${escape(details.destinationTx)}'`);
  sql(`UPDATE payment_requests SET ${assignments.join(",")} WHERE id='${escape(id)}';`);
  addEvent(id, `payment.${status}`, details);
  return getRequest(id);
}

export function addEvent(requestId: string, type: string, payload: object) {
  initialize();
  sql(`INSERT INTO payment_events (request_id,type,payload,created_at) VALUES ('${escape(requestId)}','${escape(type)}','${escape(JSON.stringify(payload))}','${new Date().toISOString()}');`);
}

export function getEvents(requestId: string) {
  initialize();
  const output = execFileSync("/usr/bin/sqlite3", ["-json", databasePath, `SELECT * FROM payment_events WHERE request_id='${escape(requestId)}' ORDER BY id DESC;`], { encoding: "utf8" });
  return JSON.parse(output || "[]") as Array<{ id: number; request_id: string; type: string; payload: string; created_at: string }>;
}

export type ComplianceRecord = {
  request_id: string;
  created_at: string;
  address: string;
  chain: string;
  decision: "approved" | "blocked";
  provider: string;
  riskLevel: "low" | "high";
  reason: string;
};

export function listComplianceRecords() {
  initialize();
  const output = execFileSync("/usr/bin/sqlite3", ["-json", databasePath, "SELECT request_id, payload, created_at FROM payment_events WHERE type='compliance.source_wallet_screened' ORDER BY id DESC;"], { encoding: "utf8" });
  return (JSON.parse(output || "[]") as Array<{ request_id: string; payload: string; created_at: string }>).map((event) => ({ request_id: event.request_id, created_at: event.created_at, ...JSON.parse(event.payload) })) as ComplianceRecord[];
}
