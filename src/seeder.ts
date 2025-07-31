import ISeederWriter from './writer';
import SeederRef from './ref';
import SeederFactory from './factory';
import { Any, combineAsKeyValuePairs, executeIfFunction } from './helpers';


type SeedId = number | undefined | null;
// rome-ignore lint: ignore
type Data = Record<string, any>;
// rome-ignore lint: ignore
type Context = Record<string, any>;
type ForeignKeys = Record<string, SeedId>;

type SeedTuple<D extends Data = Data, C extends Context = Context> = [
  id: SeedId,
  data: D,
  context: C
];

type SeedManyArgs<A extends Data = Data> = {
  args?: A;
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

  public async seed<T extends object>(factoryName: string, args: Any = {}, reuseRefs = true): Promise<SeedTuple<T>> {
    const [result] = await this.seedMany<T>(factoryName, { args, count: 1, reuseRefs });

    return result;
  }

  public async seedObject<T extends object>(factoryName: string, args: Any = {}, reuseRefs = true): Promise<T> {
    const [[_, object]] = await this.seedMany(factoryName, { args, count: 1, reuseRefs });

    return object as T;
  }

  public async seedMany<T extends object>(factoryName: string, { args = {}, count = 1, reuseRefs = true }: SeedManyArgs): Promise<Array<SeedTuple<T>>> {
    this.validateWriter();

    const factory = this.getFactory(factoryName);

    const [foreignKeys, _, context] = reuseRefs ? await this.resolveForeignKeys(factoryName, factory.refs, args, {}, reuseRefs) : [undefined, undefined, {}];

    const promises = Array.from({ length: count }).map(() => this.seedFactory<T>(factory, args, foreignKeys, context, reuseRefs));

    return Promise.all(promises);
  }

  private async seedFactory<T extends object>(
    factory: SeederFactory,
    args: Any,
    foreignKeys?: Record<string, number | null | undefined>,
    context?: Context,
    reuseRefs?: boolean
  ): Promise<SeedTuple<T>> {
    if (!context) {
      // rome-ignore lint: it make things easier to read actually
      context = {};
    }

    if (!foreignKeys) {
      // rome-ignore lint: it make things easier to read actually
      [foreignKeys, , context] = await this.resolveForeignKeys(factory.name, factory.refs, args, context, reuseRefs ?? true);
    }

    const argsWithForeignKeys = { ...args, ...foreignKeys };
    await factory.before?.(argsWithForeignKeys, context, this);
    const data = await factory.provider(argsWithForeignKeys, context);
    const dataWithForeignKeys = { ...data, ...foreignKeys };
    const id = await this.writer?.insert(factory.tableName, factory.primaryKey, dataWithForeignKeys);

    dataWithForeignKeys[factory.primaryKey] = id;
    const newContext = { ...context, [factory.name]: dataWithForeignKeys };
    await factory.after?.(argsWithForeignKeys, newContext, this);
    return [id, dataWithForeignKeys as T, newContext];
  }

  private async resolveForeignKeys(__factoryName: string, refs: SeederRef[], args: Any, initContext: Context, reuseRefs: boolean): Promise<[ForeignKeys, Record<string, object>, Context]> {
    if (!refs || !refs.length) return [{}, {}, {}];

    const results: Array<[SeedId, object, Context]> = [];
    let context = initContext || {};
    
    for (const ref of refs) {
      if (reuseRefs) {
        // continuously expand context with the previously resolved contexts
        const partialCtx = Object.assign({}, ...results.map((r) => r[2]));
        context = { ...partialCtx, ...context };
      }

      const result = await this.processForeignKey(ref, args, context, reuseRefs);
      results.push(result);
    }

    const foreignKeys = combineAsKeyValuePairs(
      refs.map((ref) => ref.foreignKey),
      results.map(([fk]) => fk)
    ) as ForeignKeys;

    const fkObjects = combineAsKeyValuePairs(
      refs.map((ref) => ref.factoryName),
      results.map(([, data]) => data)
    ) as Record<string, object>;

    const mergedContext = results.reduce<Context>(
      (acc, [, , ctx]) => ({ ...acc, ...ctx }),
      {}
    );

    return [foreignKeys, fkObjects, mergedContext];
  }

  private async processForeignKey(ref: SeederRef, args: Any, context: Context, reuseRefs: boolean): Promise<[SeedId, object, Context]> {
    const providedForeignKey = await executeIfFunction(args[ref.foreignKey]);

    if (ref.optional && providedForeignKey === null) {
      return [null, {}, {}];
    }
    
    const factory = this.getFactory(ref.factoryName);

    if (providedForeignKey !== undefined) {
      if (typeof providedForeignKey === 'object') {
        const extractedForeignKey = providedForeignKey[factory.primaryKey];
        return [extractedForeignKey, { [factory.name]: extractedForeignKey }, { [factory.name]: providedForeignKey }];
      } else if (typeof providedForeignKey === 'number') {
        return [providedForeignKey, {}, {}];
      } else {
        throw new Error(`The foreign key "${ref.foreignKey}" must be a number or an object`);
      }
    }

    let newArgs = args;
    if (reuseRefs) {
      if (ref.factoryName in context) {
        const obj = context[ref.factoryName] as Any;
        const pk = obj?.[this.getFactory(ref.factoryName).primaryKey] as SeedId;
        return [pk, obj as object, { ...context, [ref.factoryName]: obj }];
      }

      const extededArgs = Object.assign({}, ...factory.refs.map(innerRef => ({
        [innerRef.foreignKey]: context[innerRef.factoryName],
      })));
      newArgs = { ...extededArgs, ...args };
    }

    return this.seedFactory(
      factory,
      newArgs,
      undefined,
      context,
      reuseRefs
    );
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
