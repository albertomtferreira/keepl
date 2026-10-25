export const lifecycleCollections = [
  "people",
  "groups",
  "relationships",
  "importantDates",
  "personNotes",
  "memories",
  "interactions",
  "reminders",
] as const;
export type Collection = (typeof lifecycleCollections)[number];
export type RecordData = {
  id: string;
  ownerId: string;
  deletionPending?: boolean;
  [key: string]: unknown;
};
export type Snapshot = Record<Collection, RecordData[]>;
export type Target = {
  collection: "people" | "importantDates" | "memories";
  id: string;
};
export type Action = {
  collection: Collection;
  record: RecordData;
  patch?: Record<string, unknown>;
  missing?: [Collection, string][];
};
export type Plan = {
  ownerId: string;
  target?: Target;
  root?: RecordData;
  actions: Action[];
};

export function references(
  collection: string,
  record: Record<string, unknown>,
): [Collection, string][] {
  const result: [Collection, string][] = [];
  const one = (name: string, target: Collection) => {
    if (typeof record[name] === "string" && record[name])
      result.push([target, record[name] as string]);
  };
  const many = (name: string, target: Collection) => {
    if (Array.isArray(record[name]))
      for (const id of record[name])
        if (typeof id === "string") result.push([target, id]);
  };
  if (
    ["importantDates", "personNotes", "interactions", "reminders"].includes(
      collection,
    )
  )
    one("personId", "people");
  if (collection === "relationships") {
    one("fromPersonId", "people");
    one("toPersonId", "people");
  }
  if (collection === "memories") many("peopleIds", "people");
  if (collection === "people") many("groupIds", "groups");
  if (collection === "reminders") {
    one("importantDateId", "importantDates");
    one("memoryId", "memories");
  }
  return result;
}

export function canonical(value: unknown): string {
  return JSON.stringify(normalize(value));
}
function normalize(value: unknown): unknown {
  if (value && typeof value === "object") {
    if ("toMillis" in value && typeof value.toMillis === "function")
      return value.toMillis();
    if (value instanceof Date) return value.getTime();
    if (Array.isArray(value)) return value.map(normalize);
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([key, item]) => key !== "deletionPending" && item !== undefined,
        )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, normalize(item)]),
    );
  }
  return value;
}

export function buildPlan(
  ownerId: string,
  data: Snapshot,
  target?: Target,
): Plan {
  if (
    !ownerId ||
    lifecycleCollections.some((key) =>
      data[key].some((record) => record.ownerId !== ownerId),
    )
  )
    throw new Error("ownership");
  const root = target
    ? data[target.collection].find((record) => record.id === target.id)
    : undefined;
  if (target && !root) throw new Error("missing-source");
  const removedDates = new Set(
    data.importantDates
      .filter(
        (record) =>
          target?.collection === "people" && record.personId === target.id,
      )
      .map((record) => record.id),
  );
  if (target?.collection === "importantDates") removedDates.add(target.id);
  const ids = Object.fromEntries(
    lifecycleCollections.map((key) => [
      key,
      new Set(data[key].map((record) => record.id)),
    ]),
  ) as Record<Collection, Set<string>>;
  const actions: Action[] = [];
  for (const collection of lifecycleCollections)
    for (const record of data[collection]) {
      if (target?.collection === collection && target.id === record.id)
        continue;
      if (target) {
        const direct = references(collection, record).some(
          ([key, id]) => key === target.collection && id === target.id,
        );
        const dateReminder =
          collection === "reminders" &&
          removedDates.has(record.importantDateId as string);
        if (!direct && !dateReminder) continue;
        if (collection === "memories" && target.collection === "people") {
          actions.push({
            collection,
            record,
            patch: {
              peopleIds: (record.peopleIds as string[]).filter(
                (id) => id !== target.id,
              ),
            },
          });
        } else actions.push({ collection, record });
      } else {
        const missing = references(collection, record).filter(
          ([key, id]) => !ids[key].has(id),
        );
        // A reminder to an orphan date is removed in this same review, even if its personId is absent.
        if (
          collection === "reminders" &&
          data.importantDates.some(
            (date) =>
              date.id === record.importantDateId &&
              !ids.people.has(date.personId as string),
          )
        )
          missing.push([
            "people",
            data.importantDates.find(
              (date) => date.id === record.importantDateId,
            )!.personId as string,
          ]);
        if (!missing.length) continue;
        const patch =
          collection === "memories"
            ? {
                peopleIds: (record.peopleIds as string[]).filter((id) =>
                  ids.people.has(id),
                ),
              }
            : collection === "people"
              ? {
                  groupIds: (record.groupIds as string[]).filter((id) =>
                    ids.groups.has(id),
                  ),
                }
              : undefined;
        actions.push({ collection, record, patch, missing });
      }
    }
  // Delete dependent reminders before their source dates. Source root is always last.
  actions.sort(
    (a, b) =>
      Number(b.collection === "reminders") -
        Number(a.collection === "reminders") ||
      `${a.collection}/${a.record.id}`.localeCompare(
        `${b.collection}/${b.record.id}`,
      ),
  );
  return { ownerId, target, root, actions };
}

export type Backend = {
  load: (ownerId: string) => Promise<Snapshot>;
  lock: (plan: Plan) => Promise<boolean>;
  apply: (plan: Plan, actions: Action[], finish?: boolean) => Promise<void>;
};

export type TransactionPort = {
  get: (collection: Collection, id: string) => Promise<RecordData | null>;
  update: (
    collection: Collection,
    id: string,
    patch: Record<string, unknown>,
  ) => void;
  delete: (collection: Collection, id: string) => void;
};

export async function checkReferences(
  ownerId: string,
  collection: string,
  record: Record<string, unknown>,
  read: TransactionPort["get"],
) {
  const queue = references(collection, record);
  const checked = new Set<string>();
  for (const [key, id] of queue) {
    const address = `${key}/${id}`;
    if (checked.has(address)) continue;
    checked.add(address);
    const dependency = await read(key, id);
    if (
      !dependency ||
      dependency.ownerId !== ownerId ||
      dependency.deletionPending
    )
      throw new Error("reference-unavailable");
    queue.push(...references(key, dependency));
  }
}

export async function lockPlan(plan: Plan, transaction: TransactionPort) {
  const target = plan.target!;
  const current = await transaction.get(target.collection, target.id);
  if (!current) return false;
  if (
    current.ownerId !== plan.ownerId ||
    canonical(current) !== canonical(plan.root)
  )
    throw new Error("changed-plan");
  transaction.update(target.collection, target.id, { deletionPending: true });
  return true;
}

export async function applyActions(
  plan: Plan,
  actions: Action[],
  transaction: TransactionPort,
  finish = false,
  updatedAt?: unknown,
) {
  if (plan.target) {
    const root = await transaction.get(plan.target.collection, plan.target.id);
    if (!root || root.ownerId !== plan.ownerId || !root.deletionPending)
      throw new Error("changed-plan");
  }
  const records = await Promise.all(
    actions.map((action) =>
      transaction.get(action.collection, action.record.id),
    ),
  );
  for (const action of actions)
    for (const [collection, id] of action.missing ?? []) {
      const dependency = await transaction.get(collection, id);
      if (dependency && dependency.ownerId === plan.ownerId)
        throw new Error("changed-plan");
    }
  // Validate the complete chunk before issuing any writes.
  records.forEach((current, index) => {
    if (!current) return;
    if (current.ownerId !== plan.ownerId) throw new Error("ownership");
    if (canonical(current) !== canonical(actions[index].record))
      throw new Error("changed-plan");
  });
  records.forEach((current, index) => {
    if (!current) return;
    const action = actions[index];
    if (action.patch)
      transaction.update(action.collection, action.record.id, {
        ...action.patch,
        ...(updatedAt === undefined ? {} : { updatedAt }),
      });
    else transaction.delete(action.collection, action.record.id);
  });
  if (finish && plan.target)
    transaction.delete(plan.target.collection, plan.target.id);
}

export async function executePlan(
  plan: Plan,
  backend: Backend,
  progress: (count: number) => void = () => {},
) {
  if (plan.target && !(await backend.lock(plan))) {
    const remaining = await backend.load(plan.ownerId);
    if (
      lifecycleCollections.some((key) =>
        remaining[key].some((record) =>
          references(key, record).some(
            ([collection, id]) =>
              collection === plan.target!.collection && id === plan.target!.id,
          ),
        ),
      )
    )
      throw new Error("changed-plan");
    return;
  }
  const fresh = buildPlan(
    plan.ownerId,
    await backend.load(plan.ownerId),
    plan.target,
  );
  if (canonical(fresh.actions) !== canonical(plan.actions))
    throw new Error("changed-plan");
  let acknowledged = 0;
  let chunk: Action[] = [];
  let bytes = 0;
  for (const action of plan.actions) {
    const size = new TextEncoder().encode(canonical(action)).length;
    if (chunk.length && (chunk.length >= 50 || bytes + size > 4_000_000)) {
      await backend.apply(plan, chunk);
      acknowledged += chunk.length;
      progress(acknowledged);
      chunk = [];
      bytes = 0;
    }
    chunk.push(action);
    bytes += size;
  }
  if (chunk.length) {
    await backend.apply(plan, chunk);
    acknowledged += chunk.length;
    progress(acknowledged);
  }
  if (plan.target) {
    const remaining = buildPlan(
      plan.ownerId,
      await backend.load(plan.ownerId),
      plan.target,
    );
    if (remaining.actions.length) throw new Error("changed-plan");
    await backend.apply(plan, [], true);
  }
}
