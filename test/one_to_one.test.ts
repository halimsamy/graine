import { describe, it, expect, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { Seeder, ref } from '../src';
import InMemoryDatabaseWriter from './utils/writer';

describe('One-to-One Ref', () => {
  const databaseWriter = new InMemoryDatabaseWriter();
  const seeder = new Seeder(databaseWriter);

  seeder.register({
    name: 'user',
    tableName: 'users',
    primaryKey: 'userID',
    provider: () => ({
      name: faker.person.firstName(),
      phone: faker.phone.imei(),
      age: faker.number.int({ min: 18, max: 60 }),
    }),
    refs: [ref({ factoryName: 'channel', foreignKey: 'channelID' })],
  });

  seeder.register({
    name: 'channel',
    tableName: 'channels',
    primaryKey: 'channelID',
    provider: () => ({
      name: faker.word.noun(),
    }),
    refs: [],
  });

  afterEach(() => {
    seeder.cleanUp();
  });

  it('should seed a single channel', async () => {
    await seeder.seed('channel');

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(1);
    expect(channels[0].channelID).toBe(1);
  });

  it('should seed a single user and a channel correspondent', async () => {
    await seeder.seed('user');

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(1);
    expect(channels[0].channelID).toBe(1);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(1);
    expect(users[0].userID).toBe(1);
    expect(users[0].channelID).toBe(1);
  });

  it('should seed a single user and a channel correspondent with a custom name', async () => {
    await seeder.seed('user', { 
      name: 'John Doe',
      channelID: () => seeder.seed('channel', {
        name: 'Channel 1',
      }),
    });

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(1);
    expect(channels[0].channelID).toBe(1);
    expect(channels[0].name).toBe('Channel 1');

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(1);
    expect(users[0].userID).toBe(1);
    expect(users[0].channelID).toBe(1);
    expect(users[0].name).toBe('John Doe');
  });

  it('should throw an error if factory does not exist', async () => {
    await expect(seeder.seed('unknown')).rejects.toThrow('Factory "unknown" was not found');
  });
});