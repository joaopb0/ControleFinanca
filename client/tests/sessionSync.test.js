import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSessionSync } from '../src/services/sessionSync.js';

test('troca de sessão avisa outras abas sem compartilhar credenciais ou dados pessoais', () => {
  const channels = [];
  class TestChannel {
    constructor(name) { this.name = name; this.closed = false; channels.push(this); }
    postMessage(data) {
      for (const channel of channels) {
        if (channel !== this && !channel.closed && channel.name === this.name) channel.onmessage({ data });
      }
    }
    close() { this.closed = true; }
  }
  const browser = { BroadcastChannel: TestChannel };
  let firstChanges = 0;
  let secondChanges = 0;
  const first = createSessionSync(() => { firstChanges += 1; }, browser);
  const second = createSessionSync(() => { secondChanges += 1; }, browser);
  first.notify();
  assert.equal(firstChanges, 0);
  assert.equal(secondChanges, 1);
  channels[1].onmessage({ data: { user: 'untrusted-user', token: 'untrusted-token' } });
  assert.equal(secondChanges, 1);
  second.notify();
  assert.equal(firstChanges, 1);
  second.close();
  first.notify();
  assert.equal(secondChanges, 1);
  first.close();
  assert.ok(channels.every((channel) => channel.closed));
});

test('navegador sem BroadcastChannel sincroniza por um evento contendo apenas horário', () => {
  let listener;
  let removed;
  let stored;
  let changes = 0;
  const browser = {
    addEventListener: (event, callback) => { assert.equal(event, 'storage'); listener = callback; },
    removeEventListener: (event, callback) => { assert.equal(event, 'storage'); removed = callback; },
    localStorage: { setItem: (key, value) => { stored = { key, value }; } },
  };
  const sync = createSessionSync(() => { changes += 1; }, browser);
  sync.notify();
  assert.equal(stored.key, 'cf-session-changed');
  assert.match(stored.value, /^\d+$/);
  listener({ key: 'other-key', newValue: 'x' });
  assert.equal(changes, 0);
  listener({ key: stored.key, newValue: stored.value });
  assert.equal(changes, 1);
  sync.close();
  assert.equal(removed, listener);
});
