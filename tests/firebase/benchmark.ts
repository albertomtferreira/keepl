import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { OwnedFirestoreRepository } from "../../src/repositories/base-repository";
import type { Interaction } from "../../src/types";
async function main() {
  const env = await initializeTestEnvironment({
    projectId: "demo-keepl",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
  try {
    for (const size of [30, 2000]) {
      await env.clearFirestore();
      await env.withSecurityRulesDisabled(async (ctx) => {
        for (let offset = 0; offset < size; offset += 400) {
          const batch = writeBatch(ctx.firestore());
          for (let i = offset; i < Math.min(size, offset + 400); i++)
            batch.set(doc(ctx.firestore(), "interactions", `i${i}`), {
              ownerId: "bench",
              personId: "p",
              type: "other",
              occurredAt: Timestamp.fromMillis(i),
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });
          await batch.commit();
        }
      });
      const db = env.authenticatedContext("bench").firestore();
      const repo = new OwnedFirestoreRepository<Interaction>(
        "interactions",
        db as never,
      );
      // Warm emulator/JVM separately; these are local diagnostic timings, not production claims.
      await getDocs(
        query(
          collection(db, "interactions"),
          where("ownerId", "==", "bench"),
          limit(1),
        ),
      );
      const start = performance.now();
      const before = await getDocs(
        query(collection(db, "interactions"), where("ownerId", "==", "bench")),
      );
      const middle = performance.now();
      const after = await repo.list("bench", {
        orderBy: { field: "occurredAt", direction: "desc" },
        limit: 20,
      });
      const end = performance.now();
      const index = await repo.list("bench");
      console.log(
        JSON.stringify({
          dataset: size,
          before: {
            returnedDocuments: before.size,
            ms: +(middle - start).toFixed(1),
          },
          recentAfter: {
            returnedDocuments: after.length,
            ms: +(end - middle).toFixed(1),
          },
          completeIndex: {
            documents: index.length,
            maxDocumentsPerRequest: 100,
            requests: Math.floor(size / 100) + 1,
          },
        }),
      );
    }
  } finally {
    await env.cleanup();
  }
}
void main();
