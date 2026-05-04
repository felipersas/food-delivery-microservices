import { AggregateRoot } from './aggregate-root';

export interface Repository<T extends AggregateRoot<unknown>> {
  findById(id: string): Promise<T | null>;
  save(aggregate: T): Promise<void>;
  delete(id: string): Promise<void>;
}
