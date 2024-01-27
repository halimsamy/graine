import SeederRef, { RefMap } from './ref';

export type SeederFactoryProviderArgs = {
  refs?: RefMap;
  // rome-ignore lint: user defined args, we don't know what the type of the property is.
  [key: string]: any;
};

export default abstract class SeederFactory {
  abstract get id(): string;
  abstract get tableName(): string;
  abstract get primaryKey(): string;

  get refs(): SeederRef[] {
    return [];
  }

  public abstract provider(args: SeederFactoryProviderArgs): object;
}
