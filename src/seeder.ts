import ISeederWriter from './writer';
import SeederRef from './ref';
import SeederFactory from './factory';
import { Any, combineAsKeyValuePairs, executeIfFunction } from './helpers';

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

    await this.writer?.cleanUp(factories.map((f) => f.tableName));
  }

  public async seed(factoryName: string, args: Any = {}) {
    const [id] = await this.seedMany(factoryName, { args, count: 1 });

    return id;
  }

  public async seedMany(factoryName: string, { args = {}, count = 1 }: { args?: Any; count: number }) {
    this.validateWriter();

    const factory = this.getFactory(factoryName);

    const foreignKeys = await this.getForeignKeysOfRefs(factory.refs, args);
    const argsWithForeignKeys = { ...args, ...foreignKeys };

    const promises = Array.from({ length: count }).map(async () => {
      const data = await factory.provider(argsWithForeignKeys);
      const id = await this.writer?.insert(factory.tableName, factory.primaryKey, { ...data, ...foreignKeys });

      return id;
    });

    return Promise.all(promises);
  }

  private async getForeignKeysOfRefs(refs: SeederRef[], args: Any) {
    if (!refs || !refs.length) return {};

    const foreignKeys = await Promise.all(refs.map((ref) => this.getForeignKeyOfRef(ref, args)));
    return combineAsKeyValuePairs(
      refs.map((ref) => ref.foreignKey),
      foreignKeys,
    );
  }

  private async getForeignKeyOfRef(ref: SeederRef, args: Any): Promise<number | null> {
    const providedForeignKey = await executeIfFunction(args[ref.foreignKey]);

    if (ref.optional && providedForeignKey === null) {
      return null;
    }

    return providedForeignKey ?? (await this.seed(ref.factoryName));
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
