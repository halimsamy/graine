import SeederRef from './ref';

export type SeederFactoryProviderArgs = {
  refs?: { [key: string]: string | number };
  // rome-ignore lint: user defined args, we don't know what the type of the property is.
  [key: string]: any;
};

export default class SeederFactory {
  constructor(
    public readonly id: string,
    public readonly tableName: string,
    public readonly primaryKey: string,
    public readonly provider: (args: SeederFactoryProviderArgs) => object,
    public readonly refs?: SeederRef[],
  ) {}
}
