// Read-only deployment gate. Uses the pinned Firebase CLI's authenticated API client.
import { readFileSync } from "node:fs";
import { getGlobalDefaultAccount } from "firebase-tools/lib/auth.js";
import { requireAuth } from "firebase-tools/lib/requireAuth.js";
import { FirestoreApi } from "firebase-tools/lib/firestore/api.js";
import { getAuthDomains } from "firebase-tools/lib/gcp/auth.js";
import * as rules from "firebase-tools/lib/gcp/rules.js";
import { Client } from "firebase-tools/lib/apiv2.js";
import { identityOrigin } from "firebase-tools/lib/api.js";

async function main() {
  const args = process.argv.slice(2);
  const [project, originArg] = args;
  if (args.length !== 2 || !project || !originArg) {
    console.error(
      "Usage: npm run verify:firebase -- PROJECT https://BETA_HOST",
    );
    process.exitCode = 1;
    return;
  }
  const origin = new URL(originArg);
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password
  )
    throw new Error("Provide a public HTTP(S) origin without credentials.");
  await requireAuth({
    ...getGlobalDefaultAccount(),
    project,
    nonInteractive: true,
  });
  const api = new FirestoreApi();
  const [indexes, database, domains, releases] = await Promise.all([
    api.listIndexes(project),
    api.getDatabase(project, "(default)"),
    getAuthDomains(project),
    rules.listAllReleases(project),
  ]);
  const spec = JSON.parse(readFileSync("firestore.indexes.json", "utf8"));
  const indexChecks = spec.indexes.map((required) => {
    const deployed = indexes.find((index) =>
      api.indexMatchesSpec(
        index,
        structuredClone(required),
        database.databaseEdition || "STANDARD",
      ),
    );
    return {
      collection: required.collectionGroup,
      state: deployed?.state || "MISSING",
    };
  });
  const name = await rules.getLatestRulesetName(
    project,
    "cloud.firestore",
    releases,
  );
  const files = name ? await rules.getRulesetContent(name) : [];
  const normalize = (value) => value.replace(/\r\n/g, "\n").trim();
  const rulesMatch =
    files.length === 1 &&
    normalize(files[0].content) ===
      normalize(readFileSync("firestore.rules", "utf8"));
  const client = new Client({ urlPrefix: identityOrigin(), auth: true });
  const google = await client.get(
    `/admin/v2/projects/${project}/defaultSupportedIdpConfigs/google.com`,
    {
      headers: { "x-goog-user-project": project },
      skipLog: { resBody: true },
    },
  );
  // Public HTTP checks do not use Firebase credentials or browser cookies.
  const [login, offline, manifest, legacyManifest, worker] = await Promise.all(
    [
      "/login",
      "/offline",
      "/manifest.webmanifest",
      "/manifest.json",
      "/sw.js",
    ].map((path) =>
      fetch(origin.origin + path, { signal: AbortSignal.timeout(15000) }),
    ),
  );
  const manifestData = manifest.ok ? await manifest.json() : {};
  const iconChecks = await Promise.all(
    [192, 512].map(async (size) => {
      const response = await fetch(`${origin.origin}/icon-${size}.png`, {
        signal: AbortSignal.timeout(15000),
      });
      const bytes = Buffer.from(await response.arrayBuffer());
      return (
        response.ok &&
        bytes.length > 24 &&
        bytes.toString("hex", 0, 8) === "89504e470d0a1a0a" &&
        bytes.readUInt32BE(16) === size &&
        bytes.readUInt32BE(20) === size
      );
    }),
  );
  const site = {
    loginRoute: login.ok,
    offlineRoute: offline.ok,
    canonicalManifest:
      manifest.ok &&
      manifestData.start_url === "/home" &&
      manifestData.display === "standalone" &&
      [192, 512].every((size) =>
        manifestData.icons?.some((icon) => icon.src === `/icon-${size}.png`),
      ),
    legacyManifestRedirect:
      legacyManifest.url === origin.origin + "/manifest.webmanifest",
    installIcons: iconChecks.every(Boolean),
    workerPolicyVersion:
      worker.ok && (await worker.text()).includes("keepl-static-v1"),
  };
  const checks = {
    project,
    origin: origin.origin,
    secureContext:
      origin.protocol === "https:" ||
      ["localhost", "127.0.0.1"].includes(origin.hostname),
    authorizedDomain: domains.includes(origin.hostname),
    googleSignInEnabled: google.body.enabled === true,
    rulesMatch,
    indexes: indexChecks,
    site,
  };
  console.log(JSON.stringify(checks, null, 2));
  if (
    !checks.secureContext ||
    !checks.authorizedDomain ||
    !checks.googleSignInEnabled ||
    !rulesMatch ||
    indexChecks.some((index) => index.state !== "READY") ||
    Object.values(site).some((value) => !value)
  )
    process.exitCode = 1;
}
main().catch(() => {
  console.error(
    "Release verification failed. Check CLI login, project access, and origin availability; no credentials were printed.",
  );
  process.exitCode = 1;
});
