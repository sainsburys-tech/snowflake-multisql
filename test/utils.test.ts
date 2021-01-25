import { isSql } from "../src/utils";

describe("utils isSQL", () => {
  test("isSQL", () => {
    const fileNames = ["file1.sql", "file2.sql.old", "file3.old.sql"];
    expect(isSql(fileNames[0])).toBeTruthy();
    expect(isSql(fileNames[1])).toBeFalsy();
    expect(isSql(fileNames[2])).toBeTruthy();
  });
});
