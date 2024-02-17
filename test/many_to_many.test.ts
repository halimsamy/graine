import { describe, it, expect, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { Seeder, ref } from '../src';
import InMemoryDatabaseWriter from './utils/writer';

describe('Many-to-Many Ref', () => {
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
    refs: [],
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

  seeder.register({
    name: 'user_channel',
    tableName: 'user_channels',
    primaryKey: 'userChannelID',
    provider: () => ({}),
    refs: [ref({ factoryName: 'user', foreignKey: 'userID' }), ref({ factoryName: 'channel', foreignKey: 'channelID' })],
  });

  afterEach(() => {
    seeder.cleanUp();
  });

  it('should seed a many channel linked to many users', async () => {
    const [channelID1] = await seeder.seed('channel');
    const [channelID2] = await seeder.seed('channel');
    const [userID1] = await seeder.seed('user');
    const [userID2] = await seeder.seed('user');

    await seeder.seed('user_channel', { userID: userID1, channelID: channelID1 });
    await seeder.seed('user_channel', { userID: userID2, channelID: channelID1 });
    await seeder.seed('user_channel', { userID: userID1, channelID: channelID2 });
    await seeder.seed('user_channel', { userID: userID2, channelID: channelID2 });

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(2);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(2);

    const user_channels = databaseWriter.database['user_channels'];
    expect(user_channels.length).toBe(4);
    expect(user_channels[0].userID).toBe(userID1);
    expect(user_channels[0].channelID).toBe(channelID1);
    expect(user_channels[1].userID).toBe(userID2);
    expect(user_channels[1].channelID).toBe(channelID1);
    expect(user_channels[2].userID).toBe(userID1);
    expect(user_channels[2].channelID).toBe(channelID2);
    expect(user_channels[3].userID).toBe(userID2);
    expect(user_channels[3].channelID).toBe(channelID2);
  });

  it('should seed a user_channel with a user and a channel correspondent', async () => {
    const [, , context] = await seeder.seed('user_channel');

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(1);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(1);

    const user_channels = databaseWriter.database['user_channels'];
    expect(user_channels.length).toBe(1);
    expect(user_channels[0].userChannelID).toBe(1);
    expect(user_channels[0].userID).toBe(1);
    expect(user_channels[0].channelID).toBe(1);

    expect(context['user_channel']).toEqual(databaseWriter.database['user_channels'][0]);
    expect(context['user']).toEqual(users[0]);
    expect(context['channel']).toEqual(channels[0]);
  });
});
