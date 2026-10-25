import {
  doc,
  runTransaction,
  serverTimestamp,
  type Transaction,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import * as repositories from "@/repositories";
import {
  buildPlan,
  references,
  lockPlan,
  applyActions,
  executePlan,
  lifecycleCollections,
  type Backend,
  type Plan,
  type RecordData,
  type TransactionPort,
  type Snapshot,
  type Target,
} from "./plan";
export type { Plan, Target } from "./plan";

const collectionRepositories = {
  people: repositories.peopleRepository,
  groups: repositories.groupsRepository,
  relationships: repositories.relationshipsRepository,
  importantDates: repositories.importantDatesRepository,
  personNotes: repositories.personNotesRepository,
  memories: repositories.memoriesRepository,
  interactions: repositories.interactionsRepository,
  reminders: repositories.remindersRepository,
};

export const lifecycleBackend: Backend = {
  async load(ownerId) {
    return Object.fromEntries(
      await Promise.all(
        lifecycleCollections.map(async (key) => [
          key,
          await collectionRepositories[key].list(ownerId),
        ]),
      ),
    ) as Snapshot;
  },
  async lock(plan) {
    return runTransaction(db, (transaction) =>
      lockPlan(plan, port(transaction)),
    );
  },
  async apply(plan, actions, finish) {
    await runTransaction(db, (transaction) =>
      applyActions(plan, actions, port(transaction), finish, serverTimestamp()),
    );
  },
};

function port(transaction: Transaction): TransactionPort {
  return {
    async get(collection, id) {
      const snapshot = await transaction.get(doc(db, collection, id));
      return snapshot.exists()
        ? ({ ...snapshot.data(), id: snapshot.id } as RecordData)
        : null;
    },
    update(collection, id, patch) {
      transaction.update(doc(db, collection, id), patch);
    },
    delete(collection, id) {
      transaction.delete(doc(db, collection, id));
    },
  };
}

export async function previewLifecycle(ownerId: string, target?: Target) {
  const data = await lifecycleBackend.load(ownerId);
  if (
    target &&
    !data[target.collection].some((record) => record.id === target.id)
  ) {
    if (
      lifecycleCollections.some((key) =>
        data[key].some((record) =>
          references(key, record).some(
            ([collection, id]) =>
              collection === target.collection && id === target.id,
          ),
        ),
      )
    )
      throw new Error("changed-plan");
    return { ownerId, target, actions: [] } satisfies Plan;
  }
  return buildPlan(ownerId, data, target);
}
export async function confirmLifecycle(
  plan: Plan,
  progress?: (count: number) => void,
) {
  await executePlan(plan, lifecycleBackend, progress);
}
