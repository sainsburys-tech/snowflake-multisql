import { isSql } from "../src/utils";
import { expect } from "chai";

describe("utils isSQL", () => {
  it("isSQL", () => {
    const fileNames = ["file1.sql", "file2.sql.old", "file3.old.sql"];
    expect(isSql(fileNames[0])).to.be.true;
    expect(isSql(fileNames[1])).to.be.false;
    expect(isSql(fileNames[2])).to.be.true;
  });
});
