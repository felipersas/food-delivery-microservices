export abstract class ValueObject<T> {
  protected readonly props: T;

  constructor(props: T) {
    this.props = Object.freeze(props);
  }

  get value(): T {
    return this.props;
  }

  equals(other?: ValueObject<T>): boolean {
    if (!other) return false;
    if (!(other instanceof this.constructor)) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
