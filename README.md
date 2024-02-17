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
This example demonstrates seeding data for `user`(s) and `channel`(s), since having a user requires a channel, we use `refs` to define the relationship between the two and the seeder will automatically handle the relationship. You can configure factories according to your project's needs.

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
  name = 'user';
  tableName = 'users';
  primaryKey = 'userID';
  
  get refs() {
    return [
      ref({ 
        factoryName: 'channel', // reference to the channel factory, which is defined below
        foreignKey: 'channelID'
      }) // one-to-many relationship with a foreign key
    ];
  }

  provider(args, meta) {
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

  provider(args, meta) {
    return {
      name: faker.word.noun(),
    };
  }
}

Graine.register(new UserFactory());
Graine.register(new ChannelFactory());

// Seed multiple users, with the same channel
const channelID = await Graine.seed('channel',  { name: 'General Channel' });
await Graine.seedMany('user', { count: 2, args: { channelID } });

// Seed multiple users, with the different channels
await Graine.seedMany('user', { count: 2 });

// Seed multiple users, with the same channel
await Graine.seedMany('user', { count: 2, resuseRefs: false });

// Clean up
Graine.cleanUp('users', 'channels');

// Clean up all factories?
Graine.cleanUp();
```

#### Showcase (Messaging App)
This example demonstrates a messaging app scenario, where we have users, channels, channel users, and messages. We use `refs` to define the relationships between the factories, and the seeder will automatically handle the relationships.

```javascript
class UserFactory extends SeederFactory {
  name = 'user';
  tableName = 'users';
  primaryKey = 'userID';

  provider(args, meta) {
    return {
      name: args.name ?? faker.person.firstName(),
      phone: args.phone ?? faker.phone.imei(),
      age: args.age ?? faker.number.int({ min: 18, max: 60 }),
    };
  }
}

class ChannelFactory extends SeederFactory {
  name = 'channel';
  tableName = 'channels';
  primaryKey = 'channelID';

    get refs() {
    return [
      ref({ 
        factoryName: 'user',
        foreignKey: 'createdBy'
      })
    ];
  }

  provider(args, meta) {
    return {
      name: args.name ?? faker.word.noun(),
    };
  }
}

class ChannelUserFactory extends SeederFactory {
  name = 'channel_user';
  tableName = 'channel_user';
  primaryKey = 'id';

  get refs() {
    return [
      ref({ 
        factoryName: 'channel',
        foreignKey: 'channelID'
      }),
      ref({ 
        factoryName: 'user',
        foreignKey: 'userID'
      })
    ];
  }

  provider(args, meta) {
    return {
      joinedAt: args.joinedAt ?? faker.date.recent(),
    };
  }
}

class MessageFactory extends SeederFactory {
  name = 'message';
  tableName = 'messages';
  primaryKey = 'messageID';

  get refs() {
    return [
      ref({ 
        factoryName: 'user',
        foreignKey: 'sentBy'
      }),
      ref({ 
        factoryName: 'channel',
        foreignKey: 'channelID'
      })
    ];
  }

  provider(args, meta) {
    return {
      content: args.content ?? faker.lorem.sentence(),
      sentAt: args.sentAt ?? faker.date.recent(),
    };
  }
}

Graine.register(new UserFactory());
Graine.register(new ChannelFactory());
Graine.register(new ChannelUserFactory());
Graine.register(new MessageFactory());

describe('Messaging', () => {
  afterEach(() => {
    Graine.cleanUp();
  });

  it('should not allow non-channel users to send messages', async () => {
    const channelOwner = await Graine.seedObject('user');
    const [,, { channel }] = await Graine.seed('channel_user', { 
      userID: channelOwner, 
      channelID: () => Graine.seedObject('channel', { createdBy: channelOwner.userID })
    });

    const nonChannelUser = await Graine.seedObject('user');

    const subject = MessagineService.sendMessage({
      content: 'Hello, World!',
      sentBy: nonChannelUser.userID,
      channelID: channel.channelID,
    });

    await expect(subject).rejects.toThrowError('User is not a member of the channel');
  });
});

```

## Tests
Graine is thoroughly tested to ensure its reliability and functionality. You can find various test cases in the `test` folder, covering scenarios like one-to-one, one-to-many, many-to-many relationships, and deep hierarchies.

## Contributions
We welcome contributions from the community. If you have any improvements, bug fixes, or new features to add, please open a pull request on our GitHub repository.

## License
Graine is licensed under the MIT License. You can find the full license details in the LICENSE file.

Happy seeding!
