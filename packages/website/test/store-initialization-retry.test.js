import assert from "node:assert/strict";
import test from "node:test";
import { createAccountStore } from "../../hub/src/accounts.js";
import { createContentStore } from "../../hub/src/content.js";
import { createOrganizationStore } from "../../hub/src/organizations.js";

for (const create of [createAccountStore, createContentStore, createOrganizationStore]) {
  test(`${create.name} retries failed initialization without duplicating in-flight work`, async () => {
    let calls = 0, reject;
    const failure = new Error("Temporary database outage");
    const client = {
      async execute() { throw new Error("Unexpected query"); },
      batch() {
        calls++;
        return calls === 1 ? new Promise((_, fail) => { reject = fail; }) : Promise.resolve([]);
      },
    };
    const store = create(client);
    const first = store.initialize(), concurrent = store.initialize();
    assert.equal(first, concurrent);
    assert.equal(calls, 1);
    const failed = Promise.allSettled([first, concurrent]);
    reject(failure);
    for (const result of await failed) {
      assert.equal(result.status, "rejected");
      assert.equal(result.reason, failure);
    }
    const retry = store.initialize();
    assert.equal(retry, store.initialize());
    await retry;
    assert.equal(calls, 2);
    await store.initialize();
    assert.equal(calls, 2, "successful initialization remains cached");
  });
}
