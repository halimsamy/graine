import { describe, it, expect, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { Seeder, ref } from '../src';
import InMemoryDatabaseWriter from './utils/writer';

describe('Slack-clone', () => {
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
    refs: [
      ref({
        factoryName: 'user',
        foreignKey: 'ownerID',
      }),
    ],
  });

  seeder.register({
    name: 'channel_user',
    tableName: 'channel_users',
    primaryKey: 'userChannelID',
    provider: () => ({
      joinedAt: faker.date.recent(),
    }),
    refs: [ref({ factoryName: 'user', foreignKey: 'userID' }), ref({ factoryName: 'channel', foreignKey: 'channelID' })],
  });

  seeder.register({
    name: 'message',
    tableName: 'messages',
    primaryKey: 'messageID',
    provider: () => ({
      content: faker.lorem.sentence(),
      createdAt: faker.date.recent(),
    }),
    refs: [ref({ factoryName: 'user', foreignKey: 'authorID' }), ref({ factoryName: 'channel', foreignKey: 'channelID' })],
  });

  afterEach(() => {
    seeder.cleanUp();
  });

  it('should seed a channel_user with a user and a channel correspondent', async () => {
    const [, , meta] = await seeder.seed('channel_user');

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(1);
    expect(channels[0].ownerID).toBe(meta['user'].userID);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(2);

    const channel_users = databaseWriter.database['channel_users'];
    expect(channel_users.length).toBe(1);
    expect(channel_users[0].userChannelID).toBe(1);
    expect(channel_users[0].userID).toBe(1);
    expect(channel_users[0].channelID).toBe(1);

    expect(meta['channel_user']).toEqual(databaseWriter.database['channel_users'][0]);
    expect(meta['user']).toEqual(users[1]);
    expect(meta['channel']).toEqual(channels[0]);
  });

  it('should seed a message', async () => {
    const channelOwner = await seeder.seedObject('user');
    const channel = await seeder.seedObject('channel', { ownerID: channelOwner });
    await seeder.seed('channel_user', { userID: channelOwner, channelID: channel });
    const [,, meta] = await seeder.seed('message', { authorID: channelOwner, channelID: channel });

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(1);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(1);

    const messages = databaseWriter.database['messages'];
    expect(messages.length).toBe(1);
    expect(messages[0].messageID).toBe(1);
    expect(messages[0].authorID).toBe(meta['user'].userID);
    expect(messages[0].channelID).toBe(meta['channel'].channelID);

    expect(meta['message']).toEqual(messages[0]);
    expect(meta['user']).toEqual(users[0]);
    expect(meta['channel']).toEqual(channels[0]);
  });
});
