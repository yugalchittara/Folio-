"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const { Pool } = require("pg");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
let pool;

function database() {
  const hasConnectionString = Boolean(process.env.DATABASE_URL);
  if (!hasConnectionString && !(process.env.PGHOST && process.env.PGDATABASE && process.env.PGUSER && process.env.PGPASSWORD)) {
    throw new Error("Database connection variables are not configured.");
  }
  if (!pool) {
    pool = new Pool({
      ...(hasConnectionString
        ? { connectionString: process.env.DATABASE_URL }
        : {
          host: process.env.PGHOST,
          port: Number(process.env.PGPORT ?? "5432"),
          database: process.env.PGDATABASE,
          user: process.env.PGUSER,
          password: process.env.PGPASSWORD,
        }),
      ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
      max: 2,
    });
  }
  return pool;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    body: JSON.stringify(body),
  };
}

function authorized(event) {
  const configured = process.env.FOLIO_DATA_API_TOKEN;
  const headers = event.headers || {};
  const supplied = headers.authorization || headers.Authorization || headers["x-folio-data-token"];
  return Boolean(configured && supplied === `Bearer ${configured}`);
}

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${Date.now().toString(36)}`;
const asArray = (result) => result.rows;
const asOne = (result) => result.rows[0] ?? null;

async function addPaymentEvent(requestId, type, payload) {
  await database().query(
    "INSERT INTO payment_events (request_id,type,payload,created_at) VALUES ($1,$2,$3,$4)",
    [requestId, type, JSON.stringify(payload), now()],
  );
}

async function addOperationEventRecord(operationId, type, payload) {
  await database().query(
    "INSERT INTO operation_events (operation_id,type,payload,created_at) VALUES ($1,$2,$3,$4)",
    [operationId, type, JSON.stringify(payload), now()],
  );
}

async function dataOperation(method, input = {}) {
  const db = database();
  switch (method) {
    case "listOperations": return asArray(await db.query("SELECT * FROM business_operations ORDER BY created_at DESC"));
    case "getOperation": return asOne(await db.query("SELECT * FROM business_operations WHERE id=$1 LIMIT 1", [input.id]));
    case "listWallets": return asArray(await db.query("SELECT * FROM business_wallets ORDER BY created_at DESC"));
    case "listContacts": return asArray(await db.query("SELECT * FROM business_contacts ORDER BY created_at DESC"));
    case "listBankAccounts": return asArray(await db.query("SELECT * FROM business_bank_accounts ORDER BY created_at DESC"));
    case "listIntegrations": return asArray(await db.query("SELECT * FROM business_integrations ORDER BY created_at DESC"));
    case "listRequests": return asArray(await db.query("SELECT * FROM payment_requests ORDER BY created_at DESC"));
    case "getRequest": return asOne(await db.query("SELECT * FROM payment_requests WHERE id=$1 LIMIT 1", [input.id]));
    case "getEvents": return asArray(await db.query("SELECT * FROM payment_events WHERE request_id=$1 ORDER BY id DESC", [input.requestId]));
    case "getOperationEvents": return asArray(await db.query("SELECT * FROM operation_events WHERE operation_id=$1 ORDER BY id DESC", [input.operationId]));
    case "createWallet": {
      const record = { id: id("wallet"), ...input, created_at: now() };
      await db.query("INSERT INTO business_wallets (id,label,address,network,role,note,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [record.id, record.label, record.address, record.network, record.role, record.note ?? "", record.created_at]);
      return record;
    }
    case "createContact": {
      const record = { id: id("contact"), ...input, created_at: now() };
      await db.query("INSERT INTO business_contacts (id,name,type,destination,network,email,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [record.id, record.name, record.type, record.destination, record.network, record.email ?? "", record.created_at]);
      return record;
    }
    case "createBankAccount": {
      const record = { id: id("bank"), ...input, created_at: now() };
      await db.query("INSERT INTO business_bank_accounts (id,nickname,bank_name,account_last_four,country,currency,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [record.id, record.nickname, record.bank_name, record.account_last_four, record.country, record.currency, record.created_at]);
      return record;
    }
    case "createIntegration": {
      const keyPrefix = `folio_sk_test_${randomBytes(5).toString("hex")}`;
      const record = { id: id("int"), name: input.name, type: input.type, status: "active", key_prefix: keyPrefix, webhook_url: input.webhook_url ?? "", created_at: now() };
      await db.query("INSERT INTO business_integrations (id,name,type,status,key_prefix,webhook_url,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)", [record.id, record.name, record.type, record.status, record.key_prefix, record.webhook_url, record.created_at]);
      return { integration: record, secret: `${keyPrefix}_${randomBytes(10).toString("hex")}` };
    }
    case "createRequest": {
      const record = { ...input, status: "awaiting_payment", hosted_url: `/pay/${input.id}`, created_at: now(), channel: input.channel ?? "pos", merchant_wallet_id: input.merchant_wallet_id ?? null };
      await db.query("INSERT INTO payment_requests (id,business_name,reference_id,description,amount,settlement_asset,settlement_chain,status,hosted_url,created_at,channel,merchant_wallet_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)", [record.id, record.business_name, record.reference_id, record.description, record.amount, record.settlement_asset, record.settlement_chain, record.status, record.hosted_url, record.created_at, record.channel, record.merchant_wallet_id]);
      await addPaymentEvent(record.id, "payment_request.created", { source: record.channel, merchantWalletId: record.merchant_wallet_id });
      return record;
    }
    case "createOperation": {
      const record = { id: id("op"), ...input, created_at: now() };
      await db.query("INSERT INTO business_operations (id,kind,recipient,recipient_address,network,reference,source_wallet_id,bank_account_id,amount,asset,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)", [record.id, record.kind, record.recipient, record.recipient_address ?? null, record.network ?? null, record.reference ?? null, record.source_wallet_id ?? null, record.bank_account_id ?? null, record.amount, record.asset, record.status, record.created_at]);
      return record;
    }
    case "updateStatus": {
      const details = input.details ?? {};
      const result = await db.query("UPDATE payment_requests SET status=$2, source_chain=COALESCE($3,source_chain), source_tx=COALESCE($4,source_tx), near_tx=COALESCE($5,near_tx), destination_tx=COALESCE($6,destination_tx) WHERE id=$1 RETURNING *", [input.id, input.status, details.sourceChain ?? null, details.sourceTx ?? null, details.nearTx ?? null, details.destinationTx ?? null]);
      const record = asOne(result);
      if (record) await addPaymentEvent(input.id, `payment.${input.status}`, details);
      return record;
    }
    case "updateOperation": {
      const details = input.details ?? {};
      return asOne(await db.query("UPDATE business_operations SET status=$2, tx_hash=COALESCE($3,tx_hash), near_tx=COALESCE($4,near_tx), destination_tx=COALESCE($5,destination_tx), deposit_address=COALESCE($6,deposit_address), route_status=COALESCE($7,route_status), provider_reference=COALESCE($8,provider_reference) WHERE id=$1 RETURNING *", [input.id, input.status, details.txHash ?? null, details.nearTx ?? null, details.destinationTx ?? null, details.depositAddress ?? null, details.routeStatus ?? null, details.providerReference ?? null]));
    }
    case "addEvent": await addPaymentEvent(input.requestId, input.type, input.payload ?? {}); return null;
    case "addOperationEvent": await addOperationEventRecord(input.operationId, input.type, input.payload ?? {}); return null;
    case "listComplianceRecords": {
      const result = await db.query("SELECT request_id,payload,created_at FROM payment_events WHERE type='compliance.source_wallet_screened' ORDER BY id DESC");
      return result.rows.map((event) => ({ request_id: event.request_id, created_at: event.created_at, ...event.payload }));
    }
    default: throw new Error("Unsupported data operation");
  }
}

exports.handler = async (event) => {
  if (event.requestContext?.http?.method === "OPTIONS") return response(204, {});
  if (!authorized(event)) return response(401, { error: "Unauthorized" });

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    if (body.action === "health") {
      await database().query("SELECT 1");
      return response(200, { ok: true });
    }
    if (body.action === "migrate") {
      await database().query(schema);
      return response(200, { ok: true, message: "Folio schema is ready." });
    }
    if (body.action === "data") {
      return response(200, { data: await dataOperation(body.method, body.input) });
    }
    return response(400, { error: "Unsupported data operation" });
  } catch (error) {
    console.error(error);
    return response(500, { error: "Data service unavailable" });
  }
};
