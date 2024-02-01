import { describe, it, expect, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { Seeder, ref } from '../src';
import InMemoryDatabaseWriter from './utils/writer';

describe('Many-level-depth Ref', () => {
  const databaseWriter = new InMemoryDatabaseWriter();
  const seeder = new Seeder(databaseWriter);

  seeder.register({
    name: 'subscription',
    tableName: 'subscriptions',
    primaryKey: 'subscriptionID',
    provider: () => ({
      name: faker.person.fullName(),
    }),
    refs: [ref({ factoryName: 'plan', foreignKey: 'planID' }), ref({ factoryName: 'billing_cycle', foreignKey: 'billingCycleID' })],
  });

  seeder.register({
    name: 'plan',
    tableName: 'plans',
    primaryKey: 'planID',
    provider: () => ({
      name: faker.word.noun(),
    }),
    refs: [],
  });

  seeder.register({
    name: 'billing_cycle',
    tableName: 'billing_cycles',
    primaryKey: 'billingCycleID',
    provider: () => ({
      name: faker.word.noun(),
    }),
    refs: [ref({ factoryName: 'plan', foreignKey: 'planID' })],
  });

  afterEach(() => {
    seeder.cleanUp();
  });

  it('should seed a subscritpion with a plan and a billing cycle', async () => {
    const planID = await seeder.seed('plan');
    const billingCycleID = await seeder.seed('billing_cycle', { planID });
    await seeder.seed('subscription', { planID, billingCycleID });

    expect(databaseWriter.database['subscriptions'].length).toBe(1);
    expect(databaseWriter.database['plans'].length).toBe(1);
    expect(databaseWriter.database['billing_cycles'].length).toBe(1);
  });
});