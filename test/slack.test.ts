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
    refs: [
      ref({
        factoryName: 'user',
        foreignKey: 'ownerID',
      }),
    ],
    provider: () => ({
      name: faker.word.noun(),
    }),
    after: async (args, context, seeder) => {
      if (context['channel_user']) return;
      const { user, channel } = context;

      await seeder.seed('channel_user', { userID: user, channelID: channel });
    },
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
    const [, , context] = await seeder.seed('channel_user');

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(1);
    expect(channels[0].ownerID).toBe(context['user'].userID);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(2);

    const channel_users = databaseWriter.database['channel_users'];
    expect(channel_users.length).toBe(2);

    expect(context['channel_user']).toEqual(databaseWriter.database['channel_users'][1]);
    expect(context['user']).toEqual(users[1]);
    expect(context['channel']).toEqual(channels[0]);
  });

  it('should seed a channel with an owner', async () => {
    const [channelID, , context] = await seeder.seed('channel');

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(1);
    expect(channels[0].channelID).toBe(channelID);
    expect(channels[0].ownerID).toBe(context['user'].userID);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(1);

    const channel_users = databaseWriter.database['channel_users'];
    expect(channel_users.length).toBe(1);

    expect(context['channel']).toEqual(channels[0]);
    expect(context['user']).toEqual(users[0]);
  });

  it('should seed a message', async () => {
    const channelOwner = await seeder.seedObject('user');
    const [,, context] = await seeder.seed('message', { 
      authorID: channelOwner, 
      channelID: () => seeder.seedObject('channel', { ownerID: channelOwner })
    });

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(1);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(1);

    const channel_users = databaseWriter.database['channel_users'];
    expect(channel_users.length).toBe(1);

    const messages = databaseWriter.database['messages'];
    expect(messages.length).toBe(1);
    expect(messages[0].messageID).toBe(1);
    expect(messages[0].authorID).toBe(context['user'].userID);
    expect(messages[0].channelID).toBe(context['channel'].channelID);

    expect(context['message']).toEqual(messages[0]);
    expect(context['user']).toEqual(users[0]);
    expect(context['channel']).toEqual(channels[0]);
  });
});
