import { describe, it, expect, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { ISeederWriter, Seeder, SeederFactory, ref } from '../src/index';

class InMemoryDatabaseWriter implements ISeederWriter {
  // rome-ignore lint: we don't know what the type of the property is.
  public database: any = {};

  async insert(tableName: string, primaryKey: string, data: object): Promise<number> {
    if (!this.database[tableName]) this.database[tableName] = [];
    const id = this.database[tableName].length + 1;
    this.database[tableName].push({ [primaryKey]: id, ...data });
    return id;
  }
}

describe('Seeder', () => {
  describe('One-to-One Ref', () => {
    const databaseWriter = new InMemoryDatabaseWriter();
    const seeder = new Seeder(databaseWriter);

    seeder.addFactory({
      id: 'user',
      tableName: 'users',
      primaryKey: 'userID',
      provider: () => ({
        name: faker.person.firstName(),
        phone: faker.phone.imei(),
        age: faker.number.int({ min: 18, max: 60 }),
      }),
      refs: [ref({ factory: 'channel', foreignKey: 'channelID' })],
    });

    seeder.addFactory({
      id: 'channel',
      tableName: 'channels',
      primaryKey: 'channelID',
      provider: () => ({
        name: faker.word.noun(),
      }),
      refs: [],
    });

    afterEach(() => {
      databaseWriter.database = {};
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

    it('should throw an error if factory does not exist', async () => {
      await expect(seeder.seed('unknown')).rejects.toThrow('Factory with id "unknown" was not found');
    });
  });

  describe('One-to-Many Ref', () => {
    const databaseWriter = new InMemoryDatabaseWriter();
    const seeder = new Seeder(databaseWriter);

    class UserFactory extends SeederFactory {
      id = 'user';
      tableName = 'users';
      primaryKey = 'userID';

      get refs() {
        return [ref({ factory: 'channel', foreignKey: 'channelID' })];
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
      id = 'channel';
      tableName = 'channels';
      primaryKey = 'channelID';

      provider() {
        return {
          name: faker.word.noun(),
        };
      }
    }

    seeder.addFactory(new UserFactory(), new ChannelFactory());

    afterEach(() => {
      databaseWriter.database = {};
    });

    it('should seed a single channel linked to many users', async () => {
      const channelID = await seeder.seed('channel');

      await seeder.seed('user', { refs: { channelID } });
      await seeder.seed('user', { refs: { channelID } });

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

  describe('Many-to-Many Ref', () => {
    const databaseWriter = new InMemoryDatabaseWriter();
    const seeder = new Seeder(databaseWriter);

    seeder.addFactory({
      id: 'user',
      tableName: 'users',
      primaryKey: 'userID',
      provider: () => ({
        name: faker.person.firstName(),
        phone: faker.phone.imei(),
        age: faker.number.int({ min: 18, max: 60 }),
      }),
      refs: [],
    });

    seeder.addFactory({
      id: 'channel',
      tableName: 'channels',
      primaryKey: 'channelID',
      provider: () => ({
        name: faker.word.noun(),
      }),
      refs: [],
    });

    seeder.addFactory({
      id: 'user_channel',
      tableName: 'user_channels',
      primaryKey: 'userChannelID',
      provider: () => ({}),
      refs: [ref({ factory: 'user', foreignKey: 'userID' }), ref({ factory: 'channel', foreignKey: 'channelID' })],
    });

    afterEach(() => {
      databaseWriter.database = {};
    });

    it('should seed a many channel linked to many users', async () => {
      const channelID1 = await seeder.seed('channel');
      const channelID2 = await seeder.seed('channel');
      const userID1 = await seeder.seed('user');
      const userID2 = await seeder.seed('user');

      await seeder.seed('user_channel', { refs: { userID: userID1, channelID: channelID1 } });
      await seeder.seed('user_channel', { refs: { userID: userID2, channelID: channelID1 } });
      await seeder.seed('user_channel', { refs: { userID: userID1, channelID: channelID2 } });
      await seeder.seed('user_channel', { refs: { userID: userID2, channelID: channelID2 } });

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
      await seeder.seed('user_channel');

      const channels = databaseWriter.database['channels'];
      expect(channels.length).toBe(1);

      const users = databaseWriter.database['users'];
      expect(users.length).toBe(1);

      const user_channels = databaseWriter.database['user_channels'];
      expect(user_channels.length).toBe(1);
      expect(user_channels[0].userChannelID).toBe(1);
      expect(user_channels[0].userID).toBe(1);
      expect(user_channels[0].channelID).toBe(1);
    });
  });

  describe('Many-level-depth Ref', () => {
    const databaseWriter = new InMemoryDatabaseWriter();
    const seeder = new Seeder(databaseWriter);

    seeder.addFactory({
      id: 'subscription',
      tableName: 'subscriptions',
      primaryKey: 'subscriptionID',
      provider: () => ({
        name: faker.person.fullName(),
      }),
      refs: [ref({ factory: 'plan', foreignKey: 'planID' }), ref({ factory: 'billing_cycle', foreignKey: 'billingCycleID' })],
    });

    seeder.addFactory({
      id: 'plan',
      tableName: 'plans',
      primaryKey: 'planID',
      provider: () => ({
        name: faker.word.noun(),
      }),
      refs: [],
    });

    seeder.addFactory({
      id: 'billing_cycle',
      tableName: 'billing_cycles',
      primaryKey: 'billingCycleID',
      provider: () => ({
        name: faker.word.noun(),
      }),
      refs: [ref({ factory: 'plan', foreignKey: 'planID' })],
    });

    afterEach(() => {
      databaseWriter.database = {};
    });

    it('should seed a subscritpion with a plan and a billing cycle', async () => {
      await seeder.seed('subscription');

      expect(databaseWriter.database['subscriptions'].length).toBe(1);
      expect(databaseWriter.database['plans'].length).toBe(1);
      expect(databaseWriter.database['billing_cycles'].length).toBe(1);
    });
  });
});
