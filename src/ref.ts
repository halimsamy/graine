export default class SeederRef {
  constructor(public readonly factoryID: string, public readonly foreignKey: string) {}
}

export function ref(args: { factory: string; foreignKey: string }) {
  return new SeederRef(args.factory, args.foreignKey);
}

export type RefMap = { [key: string]: string | number };
