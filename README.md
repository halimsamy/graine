# Graine
Graine is a flexible data seeding library for TypeScript/JavaScript projects. It allows you to define factories for your data models, manage relationships, and seed complex data structures into any database or in-memory store. Graine is ideal for testing, prototyping, and demo environments.

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

## API Reference

### Core Concepts

#### Factory

A factory defines how to generate data for a model/table. It includes a provider function (for generating data) and references to other factories.

#### Ref

References (`ref`) define relationships between factories, such as foreign keys.

#### Writer

A writer handles how and where data is stored. You can implement your own (e.g., for in-memory, SQL, etc.).

---

### ISeederWriter

#### Interface

The `ISeederWriter` interface defines the contract for custom writers that handle data storage for seeded records.

```typescript
export default interface ISeederWriter {
  insert: (tableName: string, primaryKey: string, data: object) => Promise<number>;
  cleanUp: (tables?: string[]) => Promise<void>;
}
```

- **insert**:  
  Inserts a record into the specified table, assigning a primary key.  
  Returns the primary key value (usually a number).

- **cleanUp**:  
  Removes all records from the specified tables, or from all tables if none are specified.

**Example Implementation:**

```typescript
class InMemoryDatabaseWriter implements ISeederWriter {
  public database: any = {};

  async insert(tableName: string, primaryKey: string, data: object): Promise<number> {
    if (!this.database[tableName]) this.database[tableName] = [];
    const id = this.database[tableName].length + 1;
    this.database[tableName].push({ [primaryKey]: id, ...data });
    return id;
  }

  async cleanUp(tables?: string[]): Promise<void> {
    if (!tables) {
      this.database = {};
      return;
    }
    for (const table of tables) {
      this.database[table] = [];
    }
  }
}

Graine.register(new InMemoryDatabaseWriter());
```
---

### ref

#### `ref({ factoryName: string, foreignKey: string, optional?: boolean }): SeederRef`

Defines a reference (relationship) between factories.

- **Parameters:**
  - `factoryName`: Name of the referenced factory.
  - `foreignKey`: Foreign key field in the current factory.
  - `optional`: Whether the reference is optional (default: false).

- **Returns:** `SeederRef` object.

- **Example:**
  ```typescript
  ref({ factoryName: "team", foreignKey: "teamID" });
  ```

- **Note:** If the reference is optional, Graine will not seed the related record unless it is explicitly provided in the seed call.
---

### SeederFactory

Defines a factory for seeding data into a specific model/table.

- **Properties:**
  - `name`: Name of the factory.
  - `tableName`: Name of the database table.
  - `primaryKey`: Name of the primary key field.
  - `refs`: Array of references to other factories.
  - `before`: Optional hook to modify data before insertion.
  - `after`: Optional hook to modify data after insertion.


- **Example:**
  ```typescript
  class UserFactory extends SeederFactory {
    name = 'user';
    tableName = 'users';
    primaryKey = 'userID';

    refs() {
      return [ref({ factoryName: "team", foreignKey: "teamID" })];
    }
    
    before(args, context, seeder) {
      // ...
    }

    provider(args) {
      return {
        name: args.name ?? "Default",
      };
    }

    after(args, context, seeder) {
      // ...
      // Might be used to seed related data after this factory
    }
  }
  ```

##### What is `args`?
`args` is an object containing the arguments passed to the factory's provider function. It can include any data needed to generate the model instance.


##### What is `context`?
See below.

---

#### `register(...factories: SeederFactory[]): void`

Registers a factory for a model/table.

- **Parameters:**
  - `factories`: Array of objects describing the factory (name, tableName, primaryKey, provider, refs). Could be a class extending `SeederFactory`.

- **Example 1:**
  ```typescript
  Graine.register({
    name: "user",
    tableName: "users",
    primaryKey: "userID",
    provider: (args) => ({ name: args.name ?? "Default" }),
    refs: [ref({ factoryName: "team", foreignKey: "teamID" })],
  });
  ```

- **Example 2:**
  ```typescript
  Graine.register(new UserFactory(), new TeamFactory());
  ```

---

#### `seed(factoryName: string, args?: object): Promise<[id, record, context]>`

Seeds a single record for the given factory.

- **Parameters:**
  - `factoryName`: Name of the registered factory.
  - `args`: Optional overrides for the provider.

- **Returns:** Promise resolving to `[id, record, context]`:
  - `id`: Primary key value of the created record.
  - `record`: The created record object.
  - `context`: Context object containing references and related data.

##### What is `context`?

The `context` object contains references to all related records created or reused during the seeding process for a given factory. The keys in `context` correspond to the factory names used in the references (`refs`). Each value is the seeded record for that factory.

**Example:**

Suppose you have the following factories:

```typescript
Graine.register({
  name: "organization",
  tableName: "organizations",
  primaryKey: "organizationID",
  provider: (args) => ({ name: args.name ?? "Default Org" }),
  refs: [],
});

Graine.register({
  name: "team",
  tableName: "teams",
  primaryKey: "teamID",
  provider: (args) => ({ teamName: args.teamName ?? "Alpha" }),
  refs: [ref({ factoryName: "organization", foreignKey: "organizationID" })],
});

Graine.register({
  name: "channel",
  tableName: "channels",
  primaryKey: "channelID",
  provider: (args) => ({ channelName: args.channelName ?? "General" }),
  refs: [ref({ factoryName: "team", foreignKey: "teamID" })],
});
```

When you seed a channel:

```typescript
const [channelID, channel, context] = await Graine.seed("channel", { channelName: "Announcements" });
```

The `context` object will look like:

```typescript
{
  team: {
    teamID: ...,
    teamName: ...,
    organizationID: ...,
  },
  organization: {
    organizationID: ...,
    name: ...,
  }
}
```

- `context.team` contains the seeded team record, which itself references the organization.
- `context.organization` contains the seeded organization record.

You can use `context.team.teamID` and `context.organization.organizationID` to access the seeded IDs, which are also set as foreign keys in the channel and team records, respectively.

This makes it easy to chain and relate seeded data across multiple factories, assert relationships, and pass correct foreign keys when seeding 
dependent records.

---

#### `seedObject(factoryName: string, args?: object): Promise<record>`

A shorthand method for seeding a single object. It internally calls `seed` and returns just the record. Use if you don't care about the `context`.

**Example:**

```typescript
const user = await Graine.seedObject("user", { name: "John Doe" });
```

---

#### `seedMany(factoryName: string, options: { count: number, reuseRefs?: boolean, args?: object }): Promise<Array<[id, record, context]>>`

Seeds multiple records for the given factory.

- **Parameters:**
  - `factoryName`: Name of the registered factory.
  - `options`:
    - `count`: Number of records to create.
    - `reuseRefs`: If true, reuse references for all records.
    - `args`: Optional overrides for the provider.

- **Returns:** Promise resolving to an array of `[id, record, context]`.

##### Behavior of `reuseRefs`

- If `reuseRefs: true`, all seeded records share the same referenced objects (e.g., all channels share the same team and organization).
- If `reuseRefs: false`, each seeded record gets its own referenced objects (e.g., each channel gets a unique team, and each team gets a unique organization).

---

### Examples

#### Example 1: `reuseRefs: false`

```typescript
const results = await Graine.seedMany("channel", { count: 3, reuseRefs: false });
for (const [channelID, channel, context] of results) {
  // context.team is the unique team for this channel
  // context.organization is the unique organization for this team
  // channel.teamID === context.team.teamID
  // context.team.organizationID === context.organization.organizationID
}
```

- Each channel gets its own team, and each team gets its own organization.
- No teams or organizations are shared between channels.
- Each context object for each channel contains the unique related records for that channel, allowing you to access and assert relationships for each seeded entity independently.

---

#### Example 2: `reuseRefs: true`

```typescript
const results = await Graine.seedMany("channel", { count: 3, reuseRefs: true });
for (const [channelID, channel, context] of results) {
  // context.team is the same for all channels
  // context.organization is the same for all teams
  // channel.teamID === context.team.teamID
  // context.team.organizationID === context.organization.organizationID
}
```

- All channels share the same team, and all teams share the same organization.
- The context object is identical for all channels, referencing the same related records.

---

#### `cleanUp(): void`

Removes all seeded data from the writer.

- **Example:**
  ```typescript
  Graine.cleanUp();
  ```

## Showcase (Messaging App)
This example demonstrates a messaging app scenario, where we have users, channels, channel users, and messages. We use `refs` to define the relationships between the factories, and the seeder will automatically handle the relationships.

```javascript
class UserFactory extends SeederFactory {
  name = 'user';
  tableName = 'users';
  primaryKey = 'userID';

  provider(args, context) {
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

  provider(args, context) {
    return {
      name: args.name ?? faker.word.noun(),
    };
  }

  after(args, context, seeder) {
    // after creating a channel, we also want to add the creator as a channel user
    return Graine.seed('channel_user', { channelID: context.channel, userID: context.user || args.userID });
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

  provider(args, context) {
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

  provider(args, context) {
    return {
      content: args.content ?? faker.lorem.sentence(),
      sentAt: args.sentAt ?? faker.date.recent(),
    };
  }
}

Graine.register(new UserFactory(), new ChannelFactory(), new ChannelUserFactory(), new MessageFactory());

describe('Messaging', () => {
  afterEach(() => {
    Graine.cleanUp();
  });

  it('should allow channel owner to send messages', async () => {
    // This seeds a channel, and a user who is the owner of the channel.
    // The channel user is automatically created by the ChannelFactory's after hook
    const [,, context] = await Graine.seed('channel', { name: 'General' });

    const subject = MessagineService.sendMessage({
      content: 'Hello, World!',
      sentBy: context.user.userID,
      channelID: context.channel.channelID,
    });

    await expect(subject).resolves.toEqual(expect.objectContaining({ status: 'success' }));
  });

  it('should not allow non-channel users to send messages', async () => {
    const [,, context] = await Graine.seed('channel', { name: 'General' }); 
    const nonChannelUser = await Graine.seedObject('user');

    const subject = MessagineService.sendMessage({
      content: 'Hello, World!',
      sentBy: nonChannelUser.userID,
      channelID: context.channel.channelID,
    });

    await expect(subject).rejects.toThrowError('User is not a member of the channel');
  });
});

```

---

## Tests
Graine is thoroughly tested to ensure its reliability and functionality. You can find various test cases in the `test` folder, covering scenarios like one-to-one, one-to-many, many-to-many relationships, and deep hierarchies.

## Contributions
We welcome contributions from the community. If you have any improvements, bug fixes, or new features to add, please open a pull request on our GitHub repository.

## License
Graine is licensed under the MIT License. You can find the full license details in the LICENSE file.

Happy seeding!
