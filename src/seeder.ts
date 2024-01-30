import ISeederWriter from './writer';
import { RefMap } from './ref';
import SeederFactory, { SeederFactoryProviderArgs } from './factory';

export default class Seeder {
  private factories: SeederFactory[] = [];
  private writer?: ISeederWriter;

  constructor(writer?: ISeederWriter) {
    this.writer = writer;
  }

  public setWriter(writer: ISeederWriter) {
    this.writer = writer;
  }

  public getFactory(factoryID: string) {
    const factory = this.factories.find((f) => f.id === factoryID);
    if (!factory) throw new Error(`Factory with id "${factoryID}" was not found`);
    return factory;
  }

  public addFactory(...factories: SeederFactory[]) {
    for (const factory of factories) {
      if (this.factories.find((f) => f.id === factory.id)) throw new Error(`Factory with id "${factory.id}" already exists`);
      this.factories.push(factory);
    }
  }

  public async cleanUp(...factoryIDs: string[]) {
    if (!this.writer) throw new Error('Writer is not set, please call setWriter() before seeding');

    const factories = factoryIDs.length ? this.factories.filter((f) => factoryIDs.includes(f.id)) : this.factories;

    await this.writer.cleanUp(factories.map((f) => f.tableName));
  }

  public async seed(factoryID: string, args: SeederFactoryProviderArgs = {}) {
    if (!this.writer) throw new Error('Writer is not set, please call setWriter() before seeding');

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