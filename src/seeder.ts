import ISeederWriter from './writer';
import SeederRef from './ref';
import SeederFactory from './factory';
import { Any, combineAsKeyValuePairs, executeIfFunction } from './helpers';

type SeedManyArgs = {
  args?: Any;
  count: number;
  reuseRefs?: boolean;
};

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
    const [result] = await this.seedMany(factoryName, { args, count: 1 });

    return result;
  }

  public async seedObject(factoryName: string, args: Any = {}) {
    const [[_, object]] = await this.seedMany(factoryName, { args, count: 1 });

    return object;
  }

  public async seedMany(factoryName: string, { args = {}, count = 1, reuseRefs = true }: SeedManyArgs) {
    this.validateWriter();

    const factory = this.getFactory(factoryName);

    const [foreignKeys, _, meta] = reuseRefs ? await this.getForeignKeysOfRefs(factory.refs, args) : [undefined, undefined, {}];

    const promises = Array.from({ length: count }).map(() => this.seedFactory(factory, args, foreignKeys, meta));

    return Promise.all(promises);
  }

  private async seedFactory(
    factory: SeederFactory,
    args: Any,
    foreignKeys?: Record<string, number | null | undefined>,
    meta?: object,
  ): Promise<[number | undefined, object, object]> {
    if (!foreignKeys) {
      // rome-ignore lint: it make things easier to read actually
      [foreignKeys, , meta] = await this.getForeignKeysOfRefs(factory.refs, args);
    }

    const argsWithForeignKeys = { ...args, ...foreignKeys };

    await factory.before?.(argsWithForeignKeys, meta || {}, this);
    const data = await factory.provider(argsWithForeignKeys, meta || {});
    const dataWithForeignKeys = { ...data, ...foreignKeys };
    const id = await this.writer?.insert(factory.tableName, factory.primaryKey, dataWithForeignKeys);

    dataWithForeignKeys[factory.primaryKey] = id;
    const newMeta = { ...meta, [factory.name]: dataWithForeignKeys };
    await factory.after?.(argsWithForeignKeys, newMeta, this);
    return [id, dataWithForeignKeys, newMeta];
  }

  private async getForeignKeysOfRefs(refs: SeederRef[], args: Any): Promise<[Record<string, number | null | undefined>, Record<string, object>, Record<string, object>]> {
    if (!refs || !refs.length) return [{}, {}, {}];

    const results = await Promise.all(refs.map((ref) => this.getForeignKeyOfRef(ref, args)));
    return [
      combineAsKeyValuePairs(
        refs.map((ref) => ref.foreignKey),
        results.map(([foreignKey]) => foreignKey),
      ),
      combineAsKeyValuePairs(
        refs.map((ref) => ref.factoryName),
        results.map(([, data]) => data),
      ),
      results.reduce((acc, [, , meta]) => ({ ...acc, ...meta }), {}),
    ];
  }

  private async getForeignKeyOfRef(ref: SeederRef, args: Any): Promise<[number | undefined | null, object, object]> {
    const providedForeignKey = await executeIfFunction(args[ref.foreignKey]);

    if (ref.optional && providedForeignKey === null) {
      return [null, {}, {}];
    }

    if (providedForeignKey !== undefined) {
      if (typeof providedForeignKey === 'object') {
        const factory = this.getFactory(ref.factoryName);
        const extractedForeignKey = providedForeignKey[factory.primaryKey];
        return [extractedForeignKey, { [factory.name]: extractedForeignKey }, { [factory.name]: providedForeignKey }];
      } else if (typeof providedForeignKey === 'number') {
        return [providedForeignKey, {}, {}];
      } else {
        throw new Error(`The foreign key "${ref.foreignKey}" must be a number or an object`);
      }
    }

    return await this.seed(ref.factoryName);
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
