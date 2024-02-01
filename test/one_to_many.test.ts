import { describe, it, expect, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { Seeder, SeederFactory, ref } from '../src';
import InMemoryDatabaseWriter from './utils/writer';

describe('One-to-Many Ref', () => {
  const databaseWriter = new InMemoryDatabaseWriter();
  const seeder = new Seeder(databaseWriter);

  class UserFactory extends SeederFactory {
    name = 'user';
    tableName = 'users';
    primaryKey = 'userID';

    get refs() {
      return [ref({ factoryName: 'channel', foreignKey: 'channelID' })];
    }

    provider() {
      return {
        name: faker.person.firstName(),
        phone: faker.phone.imei(),
        age: faker.number.int({ min: 18, max: 60 }),
      };
    }
  }

  class ChannelFactory extends SeederFactory {
    name = 'channel';
    tableName = 'channels';
    primaryKey = 'channelID';

    provider() {
      return {
        name: faker.word.noun(),
      };
    }
  }

  seeder.register(new UserFactory(), new ChannelFactory());

  afterEach(() => {
    seeder.cleanUp();
  });

  it('should seed a single channel linked to many users', async () => {
    const channelID = await seeder.seed('channel');

    await seeder.seed('user', { channelID });
    await seeder.seed('user', { channelID });

    const channels = databaseWriter.database['channels'];
    expect(channels.length).toBe(1);

    const users = databaseWriter.database['users'];
    expect(users.length).toBe(2);
    expect(users[0].userID).toBe(1);
    expect(users[0].channelID).toBe(1);
    expect(users[1].userID).toBe(2);
    expect(users[1].channelID).toBe(1);
  });
});
