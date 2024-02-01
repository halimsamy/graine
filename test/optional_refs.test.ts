import { describe, it, expect, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { Seeder, ref } from '../src';
import InMemoryDatabaseWriter from './utils/writer';

describe('Optional Ref', () => {
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
    refs: [
      ref({
        factoryName: 'channel',
        foreignKey: 'channelID',
        optional: true,
      }),
    ],
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

  it('should seed a single user and a channel correspondent', async () => {
    await seeder.seed('user');

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(1);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(1);
    expect(users[0].userID).toBe(1);
    expect(users[0].channelID).toBe(1);
  });

  it('should seed a single user with a specific channel', async () => {
    const channelID = await seeder.seed('channel');
    await seeder.seed('user', { channelID });

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(1);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(1);
    expect(users[0].userID).toBe(1);
    expect(users[0].channelID).toBe(1);
  });

  it('should seed a single user without a channel', async () => {
    await seeder.seed('user', { channelID: null });

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(0);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(1);
    expect(users[0].userID).toBe(1);
    expect(users[0].channelID).toBe(null);
  });

  it('should seed a single user and a channel correspondent when ref is undefined', async () => {
    // rome-ignore lint: any is used to simulate undefined
    const channelID: any = undefined;
    await seeder.seed('user', { channelID });

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(1);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(1);
    expect(users[0].userID).toBe(1);
    expect(users[0].channelID).toBe(1);
  });
});
