# Folio data API

This package runs inside the `folio-data-api` AWS Lambda. It is the private
bridge between the Vercel-hosted Folio app and Amazon RDS PostgreSQL.

## Deploy package

From this folder:

```bash
npm install --omit=dev
zip -r folio-data-api.zip index.js schema.sql package.json node_modules
```

Upload `folio-data-api.zip` to the Lambda console. The Lambda handler is:

```text
index.handler
```

## Required Lambda environment variables

Use separate fields in Lambda to avoid placing a password inside a URL:

```text
PGHOST=RDS_ENDPOINT
PGPORT=5432
PGDATABASE=postgres
PGUSER=folio
PGPASSWORD=the-master-password
FOLIO_DATA_API_TOKEN=long-random-secret
```

`DATABASE_URL` is also supported for automated deployments, but is not needed
for the AWS Console setup.

`FOLIO_DATA_API_TOKEN` must remain server-side. It is never a browser value and
must never use a `NEXT_PUBLIC_` prefix.

## First request

After a Function URL is configured, send a `POST` request with:

```json
{ "action": "migrate" }
```

and header:

```text
Authorization: Bearer <FOLIO_DATA_API_TOKEN>
```

This creates Folio's payment, wallet, contact, operation, reconciliation, bank
account, and integration tables. It is idempotent and safe to run again.
