import { describe, it, expect, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { Seeder, ref } from '../src';
import InMemoryDatabaseWriter from './utils/writer';

describe('Seed many', () => {
  const databaseWriter = new InMemoryDatabaseWriter();
  const seeder = new Seeder(databaseWriter);

  seeder.register({
    name: 'user',
    tableName: 'users',
    primaryKey: 'userID',
    provider: (args) => ({
      name: args.name ?? faker.person.firstName(),
      phone: args.phone ?? faker.phone.imei(),
      age: args.age ?? faker.number.int({ min: 18, max: 60 }),
    }),
    refs: [ref({ factoryName: 'channel', foreignKey: 'channelID' })],
  });

  seeder.register({
    name: 'channel',
    tableName: 'channels',
    primaryKey: 'channelID',
    provider: (args) => ({
      name: args.name ?? faker.word.noun(),
    }),
    refs: [],
  });

  afterEach(() => {
    seeder.cleanUp();
  });

  it('should seed a 2 users with the same channel', async () => {
    const [[userID1], [userID2]] = await seeder.seedMany('user', {
      args: {
        name: 'John Doe',
      },
      count: 2,
    });

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(1);
    expect(channels[0].channelID).toBe(1);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(2);
    expect(users[0].userID).toBe(1);
    expect(users[0].userID).toBe(userID1);
    expect(users[0].channelID).toBe(1);
    expect(users[1].userID).toBe(2);
    expect(users[1].userID).toBe(userID2);
    expect(users[1].channelID).toBe(1);
    expect(users[0].name).toBe(users[1].name);
    expect(users[0].phone).not.toBe(users[1].phone);
  });

  it('should seed a 2 users with the same channel', async () => {
    const [channelID] = await seeder.seed('channel');
    const [[userID1], [userID2]] = await seeder.seedMany('user', {
      args: {
        name: 'John Doe',
        channelID,
      },
      count: 2,
    });

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(1);
    expect(channels[0].channelID).toBe(1);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(2);
    expect(users[0].userID).toBe(1);
    expect(users[0].userID).toBe(userID1);
    expect(users[0].channelID).toBe(1);
    expect(users[1].userID).toBe(2);
    expect(users[1].userID).toBe(userID2);
    expect(users[1].channelID).toBe(1);
    expect(users[0].name).toBe(users[1].name);
    expect(users[0].phone).not.toBe(users[1].phone);
  });

  it('should seed a 2 users with the different channels', async () => {
    const [[userID1], [userID2]] = await seeder.seedMany('user', {
      args: {
        name: 'John Doe',
      },
      count: 2,
      reuseRefs: false,
    });

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(2);
    expect(channels[0].channelID).toBe(1);
    expect(channels[1].channelID).toBe(2);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(2);
    expect(users[0].userID).toBe(1);
    expect(users[0].userID).toBe(userID1);
    expect(users[0].channelID).toBe(1);
    expect(users[1].userID).toBe(2);
    expect(users[1].userID).toBe(userID2);
    expect(users[1].channelID).toBe(2);
    expect(users[0].name).toBe(users[1].name);
    expect(users[0].phone).not.toBe(users[1].phone);
  });
});
