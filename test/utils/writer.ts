import { ISeederWriter } from '../../src';
import { Any } from '../../src/helpers';

export default class InMemoryDatabaseWriter implements ISeederWriter {
  public database: Any;

  async insert(tableName: string, primaryKey: string, data: object): Promise<number> {
    if (!this.database[tableName]) this.database[tableName] = [];
    const id = this.database[tableName].length + 1;
    this.database[tableName].push({ [primaryKey]: id, ...data });
    return id;
  }

  async cleanUp(tables?: string[]): Promise<void> {
    if (!tables) {
      this.database = {};
      return;
    }

    for (const table of tables) {
      this.database[table] = [];
    }
  }
}
