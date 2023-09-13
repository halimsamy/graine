import ISeederWriter from './writer';
import { RefMap } from './ref';
import SeederFactory, { SeederFactoryProviderArgs } from './factory';

export default class Seeder {
  private factories: SeederFactory[] = [];

  constructor(private writer: ISeederWriter) {}

  public getFactory(factoryID: string) {
    const factory = this.factories.find((f) => f.id === factoryID);
    if (!factory) throw new Error(`Factory with id "${factoryID}" was not found`);
    return factory;
  }

  public addFactory(factory: SeederFactory) {
    if (this.factories.find((f) => f.id === factory.id)) throw new Error(`Factory with id "${factory.id}" already exists`);
    this.factories.push(factory);
  }

  public async seed(factoryID: string, args: SeederFactoryProviderArgs = {}) {
    const factory = this.getFactory(factoryID);

    const orginalArgsRefs = args?.refs;
    const refs = factory.refs || [];
    const refIDs: RefMap = {};
    const refsFactoryIDs: RefMap = {};

    for (const ref of refs) {
      const refFactory = this.getFactory(ref.factoryID);
      const refRefs = refFactory.refs?.reduce((acc, ref) => ({ ...acc, [ref.foreignKey]: refsFactoryIDs[ref.factoryID] }), {});
      args.refs = { ...refRefs, ...orginalArgsRefs };
      const refID = args?.refs?.[ref.foreignKey] || (await this.seed(ref.factoryID, args));
      args.refs = orginalArgsRefs;
      refIDs[ref.foreignKey] = refID;
      refsFactoryIDs[ref.factoryID] = refID;
    }

    const data = factory.provider(args);
    const id = await this.writer.insert(factory.tableName, factory.primaryKey, { ...data, ...refIDs });
    return id;
  }
}
