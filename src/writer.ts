export default interface ISeederWriter {
  insert: (tableName: string, primaryKey: string, data: object) => Promise<number>;
  cleanUp: (tables?: string[]) => Promise<void>;
}
