export default class SeederRef {
  constructor(public readonly factoryID: string, public readonly foreignKey: string) {}
}

export function ref(factoryID: string, foreignKey: string) {
  return new SeederRef(factoryID, foreignKey);
}

export type RefMap = { [key: string]: string | number };