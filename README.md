# snowflake-multisql [![npm](https://img.shields.io/npm/v/snowflake-multisql.svg)](https://www.npmjs.com/package/snowflake-multisql) [![node](https://img.shields.io/node/v/snowflake-multisql.svg)](https://www.npmjs.com/package/snowflake-multisql) ![GitHub issues](https://img.shields.io/github/issues/brugos/snowflake-multisql)

A Multi SQL Statement, Promise-based and Typescript version to your [Snowflake](https://www.snowflake.net/) data warehouse, since the original library doesn't support this multi statement calls.

Also adds nice features like:

- replaces **tags** defined in the scripts by name using original data types (examples below).
- Also replaces **inline tags** like `select * from {%table_name%}` so you can play around different scenarios between code and the sql script. Use cases: replace database name depending on the environment used (ex: db_name_dev, db_name_prod)
- Emits **progress** events so you can monitor long run calls
- **Preview** parsed statement before sending to Snowflake.
- Shows **duration** (in miliseconds) for each chunk as well the **totalDuration**.
- Shows **data** returned by Snowflake on each statement (and not only the last statement) with the option to ommit them as well.
- Utils: Loads an entire **folder** of "\*.sql" files or an array of specific files.

PS: This library works on top of the excellent [Snowflake Promise](https://www.npmjs.com/package/snowflake-promise) for Node.js, which is a wrapper for [Snowflake SDK](https://www.npmjs.com/package/snowflake-sdk)

---

### Installation

- `yarn add snowflake-multisql`  
  or
- `npm i snowflake-multisql`

---

## How to use it

The constructor extends SnowflakePromise class addin the new method **_executeAll_**.
The unique method's param is deconstructed into the variables below:

```json
{
  "sqlText": "your SQL Text string",
  "binds": "from the original library, replace tags by sequence",
  "tags": "new, replace tags by name, whatever order them appers",
  "includeResults": true,
  "preview": true
}
```

- **tags**: replace tags by name and convert into indexed tags by the original snowflake library. You can replace tags with native objects (string, number, dates, etc). Just spread within your sql scripts like {%tag_name%} (please make sure there is no spaces around tag_name). After that, just add the array of tag/value pairs to tags param. Please check the examples below.

- **includeResults**: returns field 'data' with results for each chunk.

- **preview**: logs the final order of statements and parsed variables without executing them.

- **loadFiles**: loads all files from a specific folder ended with ".sql" (ex: file1.sql, file2.sql)

---

## Usage

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
  //  SELECT COUNT(*) FROM {%table_name%} WHERE PURCHASE_DATE={%purchase_date%};

  // file-2.sql content:
  //  SELECT * from temp_table_customer
  //  WHERE product_name = {%product_name%}

  // file-3.sql content:
  //  USE SCHEMA demo_schema;
  //  SELECT COUNT(*) FROM {%table_name%} WHERE segment_id={%segment_id%};

  const tags = [
    { tag: "purchase_date", value: new Date(1610976670682) },
    { tag: "product_name", value: "AUTOMOBILE" },
    { tag: "segment_id", value: 1234 },
    { tag: "table_name", value: "customers", inline: true },
  ];

  // NEW FEATURE: Feel free to monitor your running progress
  snowflake.progress.on("news", (data) => console.log(`
    progress: ${data.chunkOrder}/${data.chunksTotal}
    duration: ${data.duration} ms,
    totalDuration: ${data.totalDuration} ms
  `));

  const rows = await snowflake.executeAll({
    sqlText,
    tags,
    includeResults: true,
    preview: false // set it true for checking statements before sending to Snowflake.
  });

  rows.map((rows) => console.dir(rows));
}

main();
```

---

## Using GENERIC types

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

  const sqlText = await loadFiles({
    filesPath: path.join(process.cwd(), "./sqlFolder"),
  });

  type MyType = {
    id: string;
    num: number;
    date: Date;
    obj?: any;
  };

  const rows = await snowflake.executeAll<MyType>({
    sqlText,
    tags,
    includeResults: true,
  });

  rows.map((rows) => console.log("Your number is: ",rows[0].data[0].num));
}

main();
```

---

## If you prefer to manage the original binds by yourself

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

  // NEW FEATURE: Feel free to monitor your running progress
  snowflake.progress.on("news", (data) =>
    console.log(`
    progress: ${data.chunkOrder}/${data.chunksTotal}
    duration: ${data.duration} ms,
    totalDuration: ${data.totalDuration} ms
  `)
  );

  const rows = await snowflake.executeAll({
    sqlText,
    binds,
    includeResults: true,
  });

  console.log(rows);
}

main();
```
