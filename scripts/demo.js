#!/usr/bin/env node
'use strict';
/** Sends the demo scenario to a running AI Office over HTTP (same path as real hooks). */
const { demoScript } = require('../src/demo');

const PORT = Number(process.env.AI_OFFICE_PORT) || 4747;

for (const [delay, payload] of demoScript()) {
  setTimeout(() => {
    fetch(`http://127.0.0.1:${PORT}/${payload.status ? 'status' : 'event'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload.status ?? payload),
    }).catch(() => console.error(`AI Office neběží na portu ${PORT}?`));
  }, delay);
}
