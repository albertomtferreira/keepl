// Override Firebase settings with fake public configuration before Next loads env files.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
export const testEnv = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "fake-api-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-keepl.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-keepl",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:test",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123",
  NEXT_PUBLIC_FIREBASE_EMULATORS: "true",
};
if (process.argv[1]?.endsWith("test-env.mjs")) {
  const result = spawnSync(process.execPath, process.argv.slice(2), {
    stdio: "inherit",
    env: { ...process.env, ...testEnv },
  });
  if (
    result.status === 0 &&
    process.argv[2]?.replaceAll("\\", "/").endsWith("/next/dist/bin/next") &&
    process.argv.includes("build")
  ) {
    writeFileSync(".next/keepl-test-build", readFileSync(".next/BUILD_ID"));
  }
  process.exit(result.status ?? 1);
}
