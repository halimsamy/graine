import SeederRef from './ref';
import { Any } from './helpers';

export default abstract class SeederFactory {
  abstract get name(): string;
  abstract get tableName(): string;
  abstract get primaryKey(): string;

  get refs(): SeederRef[] {
    return [];
  }

  public abstract provider(args: Any): object | Promise<object>;
}
