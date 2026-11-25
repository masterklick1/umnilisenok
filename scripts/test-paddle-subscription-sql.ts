// Runs against a disposable in-process PostgreSQL, never the hosted app database.
// npx deno run -A --no-lock --node-modules-dir=auto scripts/test-paddle-subscription-sql.ts
import { PGlite } from 'npm:@electric-sql/pglite@0.3.14';
import { strict as assert } from 'node:assert';
const db = new PGlite();
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);`);
  await db.exec(await Deno.readTextFile('supabase/migrations/20261116083333_paddle_full_access.sql'));
  await db.exec(await Deno.readTextFile('supabase/migrations/20261125130000_paddle_sandbox_subscriptions.sql'));
  for (const environment of ['sandbox', 'live']) {
    await db.query(`SELECT record_paddle_customer($1,'ctm_test','owner@example.com',now())`, [environment]);
  }
  const data = { id: 'sub_test', customerId: 'ctm_test', status: 'active',
    priceId: 'price_latest', productId: 'product_latest', items: [],
    scheduledChangeAction: 'cancel', scheduledChangeAt: '2030-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' };
  const save = (environment: string, at: string, status: string) => db.query(
    `SELECT record_paddle_subscription($1,$2,$3::jsonb)`, [environment, at, JSON.stringify({ ...data, status })]);
  await save('sandbox', '2026-02-02T00:00:00Z', 'active');
  await save('sandbox', '2026-02-02T00:00:00Z', 'canceled'); // duplicate timestamp cannot overwrite
  await save('sandbox', '2026-02-01T00:00:00Z', 'canceled'); // late event cannot overwrite
  await save('live', '2026-02-01T00:00:00Z', 'trialing'); // same ID, different environment
  let result = await db.query<{ status: string; scheduled_change_action: string }>(
    `SELECT status,scheduled_change_action FROM paddle_subscriptions WHERE environment='sandbox'`);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].status, 'active');
  assert.equal(result.rows[0].scheduled_change_action, 'cancel');
  await save('sandbox', '2026-02-03T00:00:00Z', 'canceled');
  result = await db.query(`SELECT status FROM paddle_subscriptions WHERE environment='sandbox'`);
  assert.equal(result.rows[0].status, 'canceled');
  // Transaction can arrive before its subscription; replay does not insert duplicates.
  const transaction = JSON.stringify({ id: 'txn_test', customerId: 'ctm_test', subscriptionId: 'sub_not_received', status: 'completed', items: [] });
  for (let i = 0; i < 2; i++) await db.query(`SELECT record_paddle_subscription_transaction('sandbox',now(),$1::jsonb)`, [transaction]);
  const transactions = await db.query<{ count: number }>(`SELECT count(*)::int AS count FROM paddle_subscription_transactions`);
  assert.equal(transactions.rows[0].count, 1);
  await db.exec('SET ROLE authenticated');
  await assert.rejects(db.query('SELECT * FROM paddle_subscriptions'), /permission denied/);
  await assert.rejects(db.query(`SELECT record_paddle_subscription('sandbox',now(),'{}'::jsonb)`), /permission denied/);
  console.log('PASS: migration, replay, ordering, environment isolation, transaction ordering, permissions');
} finally { await db.close(); }
