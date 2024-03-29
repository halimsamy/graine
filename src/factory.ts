import Seeder from './seeder';
import SeederRef from './ref';
import { Any } from './helpers';

export default abstract class SeederFactory {
  abstract get name(): string;
  abstract get tableName(): string;
  abstract get primaryKey(): string;

  get refs(): SeederRef[] {
    return [];
  }

  public before?(args: Any, context: Any, seeder: Seeder): void | Promise<void> {
    return;
  }

  public after?(args: Any, context: Any, seeder: Seeder): void | Promise<void> {
    return;
  }

  public abstract provider(args: Any, context: Any): object | Promise<object>;
}
