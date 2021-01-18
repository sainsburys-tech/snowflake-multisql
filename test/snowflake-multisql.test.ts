import {
  SnowflakeMultiSql as Snowflake,
  ITag,
  IMultiSqlResult,
} from "../src/snowflake-multisql";

describe("checks tagsToBinds function", () => {
  let snowflake: Snowflake;

  const sqlText: string =
    "select * from {%tag0%} {%tag2%} {%tag0%} {%tag4%} where {%tag2%} {%tag4%}";
  const tags: ITag[] = [
    { tag: "tag0", value: "hi" },
    { tag: "tag2", value: 123 },
    { tag: "tag4", value: new Date(1610976670682) },
  ];
  const getError = (sqlText: string) => {
    throw new Error("###");
    // return `
    //   ### Error :
    //   Tags doesn't match with the amount found in the query.
    //   PS: You can use preview to check yout queries before running them
    //   Query:
    //   ${sqlText}
    //   ###`;
  };

  beforeAll(() => {
    snowflake = new Snowflake({
      account: "<account name>",
      username: "<username>",
      password: "<password>",
      database: "DEMO_DATABASE",
      schema: "DEMO_SCHEMA",
      warehouse: "DEMO_WH",
    });
  });

  test("tagToBinds method", async () => {
    const ret: IMultiSqlResult[] = await snowflake.executeAll({
      sqlText,
      tags,
      preview: true,
    });
    // console.log(ret);
    const expected = {
      chunkText: "select * from :1 :2 :3 :4 where :5 :6",
      chunkOrder: 1,
      chunksTotal: 1,
      binds: [
        "hi",
        123,
        "hi",
        new Date(1610976670682),
        123,
        new Date(1610976670682),
      ],
    };
    expect(ret[0]).toMatchObject(expected);
  });

  test("no tags sqltext, no tags params", () => {
    const sqlText = "select * from table";
    const ret = snowflake.tagsToBinds(sqlText);
    expect(ret.sqlText).toBe("select * from table");
    expect(ret.binds).toEqual([]);
  });

  test("no tags on sqltext, tags on params", () => {
    const sqlText = "select * from table";
    const ret = snowflake.tagsToBinds(sqlText, [{ tag: "tag1", value: 1 }]);
    expect(ret.sqlText).toBe("select * from table");
    expect(ret.binds).toEqual([]);
  });

  test("tags on sqltext, no tags on params", () => {
    const sqlText = "select * from table {%tag1%}";
    expect(() => snowflake.tagsToBinds(sqlText, [])).toThrow(new Error("###"));
  });

  test("less tag params then tags on sqltext", () => {
    const sqlText = "select * from table {%tag1%} {%tag2%}";
    expect(() =>
      snowflake.tagsToBinds(sqlText, [{ tag: "tag1", value: "tag1value" }])
    ).toThrow(new Error("###"));
  });
});
