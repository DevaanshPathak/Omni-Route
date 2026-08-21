export class InMemoryRecordStore<TRecord> {
  readonly #initialRecords: readonly TRecord[];
  readonly #identifierFor: (record: TRecord) => string;
  #records = new Map<string, TRecord>();

  constructor(initialRecords: readonly TRecord[], identifierFor: (record: TRecord) => string) {
    this.#initialRecords = structuredClone(initialRecords);
    this.#identifierFor = identifierFor;
    this.reset();
  }

  get(identifier: string): TRecord | undefined {
    const record = this.#records.get(identifier);
    return record === undefined ? undefined : structuredClone(record);
  }

  replace(identifier: string, record: TRecord): TRecord | undefined {
    if (!this.#records.has(identifier)) {
      return undefined;
    }

    const nextRecord = structuredClone(record);
    this.#records.set(identifier, nextRecord);
    return structuredClone(nextRecord);
  }

  list(): TRecord[] {
    return [...this.#records.values()].map((record) => structuredClone(record));
  }

  reset(): void {
    const nextRecords = new Map<string, TRecord>();

    for (const record of this.#initialRecords) {
      const identifier = this.#identifierFor(record);
      if (nextRecords.has(identifier)) {
        throw new Error(`Duplicate synthetic record identifier: ${identifier}`);
      }
      nextRecords.set(identifier, structuredClone(record));
    }

    this.#records = nextRecords;
  }
}
