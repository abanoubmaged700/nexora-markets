import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('production sql.js persistence reload and disk failure', async () => {
  const previous = process.cwd();
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'nexora-persistence-test-'));
  process.chdir(temporary);
  const store = await import('../src/db/sqliteDatabase.ts');
  const rename = fs.renameSync;
  try {
    await store.initDatabase();
    store.getDb().run('CREATE TABLE audit_fixture(value TEXT)');
    store.getDb().run("INSERT INTO audit_fixture VALUES ('durable')");
    store.saveDatabaseToDisk();
    store.getDb().run("INSERT INTO audit_fixture VALUES ('must-not-acknowledge')");
    fs.renameSync = () => { throw new Error('synthetic disk failure'); };
    assert.throws(() => store.saveDatabaseToDisk(), /DATABASE_PERSISTENCE_FAILED/);
    assert.equal(store.getDb(), null);
    fs.renameSync = rename;
    await store.initDatabase();
    assert.deepEqual(store.getDb().exec('SELECT value FROM audit_fixture')[0].values, [['durable']]);
  } finally {
    fs.renameSync = rename;
    store.getDb()?.close();
    process.chdir(previous);
    // Delete only the exact directory created by mkdtemp for this test.
    fs.rmSync(temporary, { recursive: true });
  }
});
