export default class SeederRef {
  constructor(
    public readonly factoryName: string,
    public readonly foreignKey: string,
    public readonly optional: boolean = false
  ) {}
}

export function ref(args: { factoryName: string; foreignKey: string, optional?: boolean}) {
  return new SeederRef(args.factoryName, args.foreignKey, !!args.optional);
}
