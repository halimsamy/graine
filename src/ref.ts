export default class SeederRef {
  constructor(public readonly factoryName: string, public readonly foreignKey: string) {}
}

export function ref(args: { factoryName: string; foreignKey: string }) {
  return new SeederRef(args.factoryName, args.foreignKey);
}

export type RefMap = { [key: string]: string | number };
