# Graine
Graine is a versatile Node.js tool that simplifies the process of populating databases with test data. It allows you to generate structured and realistic data, making it an essential tool for testing and development.

<a href="https://www.buymeacoffee.com/halimsamy" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## Features
- Hierarchical Data Generation: Graine can create complex, nested data structures with ease, including one-to-one, one-to-many, many-to-many relationships, and even deep hierarchies.
- Customizable Data Templates: You can tailor the generated data to match your database schema requirements, ensuring accurate testing scenarios.
- Efficiency and Speed: Graine is designed for efficiency and speed, making it suitable for projects with large-scale data seeding needs.
- Cross-Framework Compatibility: It can seamlessly integrate with various databases, ORMs, and frameworks, making it a versatile choice for a wide range of projects.

## Getting Started
To get started with Graine, follow these simple steps:

### Installation
You can install Graine using npm or yarn:
```bash
npm install -D graine
```

### Usage
#### Using Classes
```typescript
import Graine, { SeederFactory, ISeederWriter } from 'graine';
import { faker } from '@faker-js/faker';

class MyDatabaseWriter implements ISeederWriter {
  async insert(tableName: string, primaryKey: string, data: object): Promise<number> {
    // insert data into the database...
  }

  async cleanUp(tables?: string[]): Promise<void> {
    // clean up the database... should clean up all tables if no tables are specified
  }
}

Graine.setWriter(new MyDatabaseWriter());

class UserFactory extends SeederFactory {
  id = 'user';
  tableName = 'users';
  primaryKey = 'userID';
  
  get refs() {
    return [
      ref({ 
        factory: 'channel', // reference to the channel factory, which is defined below
        foreignKey: 'channelID'
      }) // one-to-many relationship with a foreign key
    ];
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

Graine.addFactory(new UserFactory());
Graine.addFactory(new ChannelFactory());

// Seed users each with different channel
await Graine.seed('user'); // seed one user, with a random channel
await Graine.seed('user'); // seed another user, with a another random channel

// Seed multiple users, with the same channel
const channelID = await Graine.seed('channel'); // seed one channel

await Graine.seed('user', { refs: { channelID } }); // seed one user, with the specified channel
await Graine.seed('user', { refs: { channelID } }); // seed another user, with the same channel

// Clean up
Graine.cleanUp('users');
Graine.cleanUp('channels');

// Clean up all factories?
Graine.cleanUp();
```

#### More of a JavaScript person?
```javascript
const { Seeder, SeederFactory, ref } = require('graine');
const { faker } = require('@faker-js/faker');

// Initialize Seeder (you can use the default exported Graine instance)
const seeder = new Seeder(new MyDatabaseWriter());

// Define data factories
seeder.addFactory({
  id: 'user',
  tableName: 'users',
  primaryKey: 'userID',
  provider: () => ({
    name: faker.person.firstName(),
    phone: faker.phone.imei(),
    age: faker.number.int({ min: 18, max: 60 }),
  }),
  refs: [
    ref({ 
      factory: 'channel', // reference to the channel factory, which is defined below
      foreignKey: 'channelID'
     }) // one-to-many relationship with a foreign key
  ],
});

seeder.addFactory({
  id: 'channel',
  tableName: 'channels',
  primaryKey: 'channelID',
  provider: () => ({
    name: faker.word.noun(),
  }),
  refs: [] // no references, e.g. this table doesn't have any foreign keys
});

await seeder.seed('user'); // seed one user, with a random channel
```

This example demonstrates seeding data for `user`(s) and `channel`(s), since having a user requires a channel, we use `refs` to define the relationship between the two and the seeder will automatically handle the relationship. You can configure factories according to your project's needs.

## Tests
Graine is thoroughly tested to ensure its reliability and functionality. You can find various test cases in the `test` folder, covering scenarios like one-to-one, one-to-many, many-to-many relationships, and deep hierarchies.

## Contributions
We welcome contributions from the community. If you have any improvements, bug fixes, or new features to add, please open a pull request on our GitHub repository.

## License
Graine is licensed under the MIT License. You can find the full license details in the LICENSE file.

Happy seeding!
