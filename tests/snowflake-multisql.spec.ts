import { expect, assert } from "chai";
import sinon from "sinon";

import {
  SnowflakeMultiSql as Snowflake,
  ITag,
  IMultiSqlResult,
} from "../src/snowflake-multisql";

describe("test1", () => {
  it("test", () => expect(true).to.be.true);
});

describe("checks tagsToBinds function", () => {
  let snowflake: Snowflake;

  const sqlText: string =
    "select * from {%tag0%} {%tag2%} {%tag0%} {%tag4%} where {%tag2%} {%tag4%}";
  const tags: ITag[] = [
    { tag: "tag0", value: "hi" },
    { tag: "tag2", value: 123 },
    { tag: "tag4", value: new Date(1610976670682) },
  ];

  beforeEach(() => {
    snowflake = new Snowflake({
      account: "<account name>",
      username: "<username>",
      password: "<password>",
      database: "DEMO_DATABASE",
      schema: "DEMO_SCHEMA",
      warehouse: "DEMO_WH",
    });
    const stubSF = sinon.stub(snowflake, "execute");
    stubSF.resolves([
      {
        FIELD_1: "VALUE_FIELD_1",
        NumField: 123,
        DateField: new Date(),
        ObjField: { a: "a", b: 1, c: new Date() },
      },
    ]);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("executeAll must emmit progress event at least once", async () => {
    const spyProgress = sinon.spy();
    snowflake.on("progress", spyProgress);

    const ret: IMultiSqlResult[] = await snowflake.executeAll({
      sqlText,
      tags,
      preview: true,
    });

    expect(spyProgress.called).to.be.true;
  });

  it("matches expected response", async () => {
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
    const ret: IMultiSqlResult[] = await snowflake.executeAll({
      sqlText,
      tags,
      includeResults: false,
    });
    expect(ret[0]).to.containSubset(expected);
  });

  it("no tags sqltext, no tags params", () => {
    const sqlText = "select * from table";
    const ret = snowflake.tagsToBinds(sqlText);
    expect(ret.sqlText).to.eql("select * from table");
    expect(ret.binds).to.eql([]);
  });

  it("no tags on sqltext, tags on params", () => {
    const sqlText = "select * from table";
    const ret = snowflake.tagsToBinds(sqlText, [{ tag: "tag1", value: 1 }]);
    expect(ret.sqlText).to.eql("select * from table");
    expect(ret.binds).to.eql([]);
  });

  it("tags on sqltext, no tags on params", () => {
    const sqlText = "select * from table {%tag1%}";
    try {
      snowflake.tagsToBinds(sqlText, []);
    } catch (error) {
      assert.equal(error.message, "###");
    }
  });

  it("less tag params then tags on sqltext", () => {
    const sqlText = "select * from table {%tag1%} {%tag2%}";
    const tags: ITag[] = [{ tag: "tag1", value: "tag1value" }];
    try {
      snowflake.tagsToBinds(sqlText, tags);
    } catch (error) {
      assert.equal(error.message, "###");
    }
  });
});
