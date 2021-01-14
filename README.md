# snowflake-multisql

A Multi SQL, Promise-based and Typescript version to your [Snowflake](https://www.snowflake.net/) data warehouse.

This library works on top of the excellent [Snowflake Promise](https://www.npmjs.com/package/snowflake-promise) for Node.js, which is a wrapper for [Snowflake SDK](https://www.npmjs.com/package/snowflake-sdk)

Unfortunately [Snowflake SDK](https://www.npmjs.com/package/snowflake-sdk) doesn't support multi statement calls.

## Installation

- `yarn add snowflake-multisql` or `npm i snowflake-multisql`

## Basic usage

```typescript
const Snowflake = require("snowflake-multisql").Snowflake;
// or, for TypeScript:
import { Snowflake } from "snowflake-multisql";

async function main() {
  const snowflake = new Snowflake({
    account: "<account name>",
    username: "<username>",
    password: "<password>",
    database: "DEMO_DATABASE",
    schema: "DEMO_SCHEMA",
    warehouse: "DEMO_WH",
  });

  await snowflake.connect();

  const rows = await snowflake.executeAll(
    "SELECT COUNT(*) FROM CUSTOMER WHERE C_MKTSEGMENT=:1",
    ["AUTOMOBILE"]
  );

  console.log(rows);
}

main();
```

## Connecting

The constructor extends SnowflakePromise class or take your Snowflake instance and argument.
