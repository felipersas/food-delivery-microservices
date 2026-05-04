export abstract class Entity<TId> {
  protected readonly id: TId;

  constructor(id: TId) {
    this.id = id;
  }

  getId(): TId {
    return this.id;
  }

  equals(other?: Entity<TId>): boolean {
    if (!other) return false;
    if (!(other instanceof this.constructor)) return false;
    return this.id === other.id;
  }
}
