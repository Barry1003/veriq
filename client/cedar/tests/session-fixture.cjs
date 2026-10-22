const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadModule } = require('./load-module.cjs');
function configure() {
  Object.assign(process.env, { DEMO_AUTH_ENABLED: 'true', CEDAR_SESSION_SECRET: 'cedar-test-signing-secret-32-characters', CEDAR_UI_ORIGIN: 'http://localhost:3000', CEDAR_DATA_SOURCE: 'api', CEDAR_API_URL: 'http://127.0.0.1:8611', CEDAR_REQUEST_COOKIE_SECRET: 'cedar-test-recovery-secret-32-characters', CEDAR_CUSTOMER_TOKEN: 'customer-bearer', CEDAR_STAFF_TOKEN: 'staff-bearer', CEDAR_FEED_TOKEN: 'feed-bearer', CEDAR_CHANNEL_TOKEN: 'staff-bearer', CEDAR_SIMULATOR_TOKEN: 'simulator-bearer' });
  for (const role of ['CUSTOMER','STAFF','OPERATOR']) {
    process.env[`CEDAR_${role}_USERNAME`] = role.toLowerCase();
    process.env[`CEDAR_${role}_PASSWORD`] = `synthetic-${role}-password`;
  }
  process.env.CEDAR_REQUEST_STORE = fs.mkdtempSync(path.join(os.tmpdir(), 'cedar-requests-test-'));
}
function session(role='customer') {
  const auth=loadModule('../../shared/server/demo-session.ts');
  const login=auth.authenticate('cedar',role,`synthetic-${role.toUpperCase()}-password`);
  return { ...login, auth };
}
module.exports={ configure, session };
