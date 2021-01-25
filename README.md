# snowflake-multisql [![node](https://img.shields.io/node/v/snowflake-multisql.svg)](https://www.npmjs.com/package/snowflake-multisql)

A Multi SQL, Promise-based and Typescript version to your [Snowflake](https://www.snowflake.net/) data warehouse.

This library works on top of the excellent [Snowflake Promise](https://www.npmjs.com/package/snowflake-promise) for Node.js, which is a wrapper for [Snowflake SDK](https://www.npmjs.com/package/snowflake-sdk)

Unfortunately [Snowflake SDK](https://www.npmjs.com/package/snowflake-sdk) doesn't support multi statement calls.

## Installation

- `yarn add snowflake-multisql` or `npm i snowflake-multisql`

---

## Connecting

The constructor extends SnowflakePromise class addin the new method **_executeAll_**.
The unique method's param is deconstructed into the variables below:

```json
{
  "sqlText": "your SQL Text string",
  "binds": "from the original library, replace tags by sequence",
  "replaceTags": "new, replace tags by name, whatever order them appers",
  "includeResults": true,
  "preview": true
}
```

- **tags**: replace tags by name and convert into indexed tags by the original snowflake library. You can replace tags with native objects (string, number, dates, etc). Just spread within your sql scripts like {%tag_name%} (please make sure there is no spaces around tag_name). After that, just add the array of tag/value pairs to tags param. Please check the examples below.

- **includeResults**: returns field 'data' with results for each chunk.

- **preview**: logs the final order of statements and parsed variables without executing them.

- **loadFiles**: loads all files from a specific folder ended with ".sql" (ex: file1.sql, file2.sql)

---

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
    SELECT COUNT(*) FROM customer WHERE C_MKTSEGMENT_ID=:2;
  `;
  const binds = ["AUTOMOBILE", 1234];

  const rows = await snowflake.executeAll({
    sqlText,
    binds,
    includeResults: true,
  });

  console.log(rows);
}

main();
```

---

## Advanced options

```typescript
  import { Snowflake, loadFiles } from "snowflake-multisql"

  const snowflake = new Snowflake({
    account: "<account name>",
    username: "<username>",
    password: "<password>",
    database: "DEMO_DATABASE",
    schema: "DEMO_SCHEMA",
    warehouse: "DEMO_WH",
  });

  // SWISS ARMY KNIFE: Just point your folder and this util method will
  // merge all files ended with '.sql'
  // IMPORTANT: it merges in the order files appear in your operating system
  // i.e. alphabetical order
  const sqlText = await loadFiles({
    filesPath: path.join(process.cwd(), "./sqlFolder"),
  });

  // file-1.sql content:
  //  CREATE OR REPLACE TABLE temp_table_customer as
  //  SELECT COUNT(*) FROM customer WHERE PURCHASE_DATE={%purchase_date%};

  // file-2.sql content:
  //  SELECT * from temp_table_customer
  //  WHERE product_name = {%product_name%}

  // file-3.sql content:
  //  USE SCHEMA demo_schema;
  //  SELECT COUNT(*) FROM customer WHERE segment_id={%segment_id%};

  const replaceTags = [
    { tag: "purchase_date", value: new Date(1610976670682) },
    { tag: "product_name", value: "AUTOMOBILE" },
    { tag: "segment_id", value: 1234 },
  ];

  const rows = await snowflake.executeAll({
    sqlText,
    replaceTags,
    includeResults: true,
    preview: false // set it to true if you want to check the scripts first.
  });

  rows.map((row) => console.dir(row));
}

main();
```

---

## Advanced options with reaplceTags

```typescript
  import { Snowflake, loadFiles } from "snowflake-multisql"

  const snowflake = new Snowflake({
    account: "<account name>",
    username: "<username>",
    password: "<password>",
    database: "DEMO_DATABASE",
    schema: "DEMO_SCHEMA",
    warehouse: "DEMO_WH",
  });

  // SWISS ARMY KNIFE as explained in the earlier example
  const sqlText = await loadFiles({
    filesPath: path.join(process.cwd(), "./sqlFolder"),
  });

  // file-1.sql content:
  //  CREATE OR REPLACE TABLE temp_table_customer as
  //  SELECT COUNT(*) FROM customer WHERE C_MKTSEGMENT={%tag_auto%};

  // file-2.sql content:
  //  SELECT * from temp_table_customer
  //  WHERE product_name = {%tag_auto%}

  // file-3.sql content:
  //  USE SCHEMA demo_schema;
  //  SELECT COUNT(*) FROM customer WHERE c_mktsegment={%tag_bike%};

  const replaceTags = [
    { tag: "tag_auto", value: "AUTOMOBILE" },
    { tag: "tag_bike", value: "BIKE" },
  ];

  const rows = await snowflake.executeAll({
    sqlText,
    replaceTags,
    includeResults: true,
  });

  rows.map((row) => console.dir(row));
}

main();
```
