import { describe, it, expect, afterEach } from 'vitest';
import { Seeder, ref } from '../src';
import InMemoryDatabaseWriter from './utils/writer';
import { faker } from '@faker-js/faker';

describe('Reuse References', () => {
  const databaseWriter = new InMemoryDatabaseWriter();
  const seeder = new Seeder(databaseWriter);

  afterEach(() => {
    seeder.cleanUp();
  });

  seeder.register({
    name: 'currency',
    tableName: 'currencies',
    primaryKey: 'currencyID',
    provider: (args) => ({
      currencyCode: args.currencyCode ?? faker.finance.currencyCode(),
      currencyName: args.currencyName ?? faker.finance.currencyName(),
    }),
    refs: [],
  });

  seeder.register({
    name: 'organization',
    tableName: 'organizations',
    primaryKey: 'organizationID',
    provider: (args) => ({
      organizationName: args.organizationName ?? faker.company.name(),
      selfRegistration: args.selfRegistration ?? false,
    }),
    refs: [ref({ factoryName: 'currency', foreignKey: 'currencyID' })],
  });

  seeder.register({
    name: 'user',
    tableName: 'users',
    primaryKey: 'userID',
    provider: (args) => ({
      name: args.name ?? faker.person.firstName(),
    }),
    refs: [],
  });

  seeder.register({
    name: 'child',
    tableName: 'children',
    primaryKey: 'childID',
    provider: (args) => ({
      fullName: args.fullName ?? faker.person.fullName(),
      grade: args.grade ?? faker.word.noun(),
    }),
    refs: [ref({ factoryName: 'organization', foreignKey: 'organizationID' }), ref({ factoryName: 'user', foreignKey: 'userID' })],
  });

  seeder.register({
    name: 'merchant',
    tableName: 'merchants',
    primaryKey: 'merchantID',
    provider: (args) => ({
      merchantName: args.merchantName ?? faker.company.name(),
    }),
    refs: [ref({ factoryName: 'currency', foreignKey: 'currencyID' })],
  });

  seeder.register({
    name: 'branch',
    tableName: 'branches',
    primaryKey: 'branchID',
    provider: (args) => ({
      branchName: args.branchName ?? faker.company.name(),
    }),
    refs: [ref({ factoryName: 'merchant', foreignKey: 'merchantID' })],
  });

  seeder.register({
    name: 'ledger',
    tableName: 'ledger',
    primaryKey: 'ledgerID',
    provider: (args) => ({
      name: args.name ?? faker.word.noun(),
    }),
    refs: [
      ref({ factoryName: 'branch', foreignKey: 'branchID' }),
      ref({ factoryName: 'child', foreignKey: 'childID' }),
      ref({ factoryName: 'currency', foreignKey: 'currencyID' }),
    ],
  });

  it('should reuse references when seeding', async () => {
    await seeder.seed('ledger');

    expect(databaseWriter.database['currencies']).toHaveLength(1);
    expect(databaseWriter.database['organizations']).toHaveLength(1);
    expect(databaseWriter.database['merchants']).toHaveLength(1);
    expect(databaseWriter.database['users']).toHaveLength(1);
    expect(databaseWriter.database['children']).toHaveLength(1);
  });

  it("shouldn't reuse references when seeding", async () => {
    await seeder.seed('ledger', {}, false);

    expect(databaseWriter.database['currencies']).toHaveLength(3);
    expect(databaseWriter.database['organizations']).toHaveLength(1);
    expect(databaseWriter.database['merchants']).toHaveLength(1);
    expect(databaseWriter.database['users']).toHaveLength(1);
    expect(databaseWriter.database['children']).toHaveLength(1);
  });
});
