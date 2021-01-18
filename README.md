# snowflake-multisql [![node](https://img.shields.io/node/v/snowflake-multisql.svg)](https://www.npmjs.com/package/snowflake-multisql)

A Multi SQL, Promise-based and Typescript version to your [Snowflake](https://www.snowflake.net/) data warehouse.

This library works on top of the excellent [Snowflake Promise](https://www.npmjs.com/package/snowflake-promise) for Node.js, which is a wrapper for [Snowflake SDK](https://www.npmjs.com/package/snowflake-sdk)

Unfortunately [Snowflake SDK](https://www.npmjs.com/package/snowflake-sdk) doesn't support multi statement calls.

## Installation

- `yarn add snowflake-multisql` or `npm i snowflake-multisql`

## Connecting

The constructor extends SnowflakePromise class addin the new method **_executeAll_**.
The unique method's param is deconstructed into the variables below:

```json
{
  "sqlText": "your SQL Text string",
  "binds": "from the original library, replace tags by sequence",
  "replaceTags": "new, replace tags by name, whatever order them appers",
  "includeResults": true, // returns field 'data' with results for each chunk.
  "preview": true // logs the final order of statements and parsed variables without executing them.
}
```

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

  const sqlText = `
    CREATE OR REPLACE TABLE temp_table_customer as
     SELECT COUNT(*) FROM customer WHERE C_MKTSEGMENT=:1;

    USE SCHEMA demo_schema;
    SELECT COUNT(*) FROM customer WHERE c_mktsegment=:2;
  `;
  const binds = ["AUTOMOBILE", "BIKE"];

  const rows = await snowflake.executeAll({
    sqlText,
    binds,
    includeResults: true,
  });

  console.log(rows);
}

main();
```
