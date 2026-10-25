export async function settleReads<T extends readonly unknown[]>(reads: {
  [K in keyof T]: Promise<T[K]>;
}): Promise<T> {
  const results = await Promise.allSettled(reads);
  const failed = results.filter(
    (result) => result.status === "rejected",
  ).length;
  if (failed) throw new ReadFailure(failed < results.length);
  return results.map(
    (result) => (result as PromiseFulfilledResult<unknown>).value,
  ) as unknown as T;
}
export class ReadFailure extends Error {
  constructor(public readonly partial: boolean) {
    super("read-failed");
  }
}
