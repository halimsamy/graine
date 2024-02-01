import { describe, it, expect } from 'vitest';
import { Seeder } from '../src';
import InMemoryDatabaseWriter from './utils/writer';

describe('Setting a writer', () => {
  const seeder = new Seeder();

  it('should throw an error if writer is not set', async () => {
    await expect(seeder.seed('user')).rejects.toThrow('Writer is not set, please call setWriter() before seeding');
  });

  it('should not throw an error if writer is set', async () => {
    seeder.setWriter(new InMemoryDatabaseWriter());
    await expect(seeder.seed('user')).rejects.toThrow('Factory "user" was not found');
  });
});
