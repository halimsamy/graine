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

  public register(...factories: SeederFactory[]): boolean {
    if (factories.some((f1) => this.factories.some((f2) => f1.name === f2.name))) return false;

    this.factories.push(...factories);

    return true;
  }

  public async cleanUp(...factoryNames: string[]) {
    this.validateWriter();

    const factories = factoryNames.length ? this.factories.filter((f) => factoryNames.includes(f.name)) : this.factories;

    await this.writer!.cleanUp(factories.map((f) => f.tableName));
  }

  public async seed(factoryName: string, args: SeederFactoryProviderArgs = {}) {
    this.validateWriter();

    const factory = this.getFactory(factoryName);

    const orginalArgsRefs = args?.refs;
    const refs = factory.refs || [];
    const refIDs: RefMap = {};
    const refsFactoryNames: RefMap = {};

    for (const ref of refs) {
      const refFactory = this.getFactory(ref.factoryName);
      const refRefs = refFactory.refs?.reduce((acc, ref) => ({ ...acc, [ref.foreignKey]: refsFactoryNames[ref.factoryName] }), {});
      args.refs = { ...refRefs, ...orginalArgsRefs };
      const refID = args?.refs?.[ref.foreignKey] || (await this.seed(ref.factoryName, args));
      args.refs = orginalArgsRefs;
      refIDs[ref.foreignKey] = refID;
      refsFactoryNames[ref.factoryName] = refID;
    }

    const data = factory.provider(args);
    const id = await this.writer!.insert(factory.tableName, factory.primaryKey, { ...data, ...refIDs });
    return id;
  }

  private getFactory(factoryName: string) {
    const factory = this.factories.find((f) => f.name === factoryName);
    if (!factory) throw new Error(`Factory "${factoryName}" was not found`);
    return factory;
  }

  private validateWriter() {
    if (!this.writer) throw new Error('Writer is not set, please call setWriter() before seeding or cleanning up');
  }
}