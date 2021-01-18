import { promises as fsp } from "fs";

/**
 * Load files in a specific directory in the order they appear
 * @param fileNames
 * @param folderName
 */
export async function loadFiles({
  filesPath,
  fileNames = [],
}: {
  filesPath: string;
  fileNames?: string[];
}): Promise<string> {
  let files: string[];
  if (fileNames.length === 0) {
    files = await fsp.readdir(filesPath);
  } else {
    files = [...fileNames];
  }
  console.dir(files);

  const promises = [];
  files.map((fileName) => {
    if (isSql(fileName)) {
      promises.push(fsp.readFile(filesPath.concat("/", fileName), "utf-8"));
    }
  });
  const iterators = await Promise.all(promises);
  const reducer = (acc: string, current: string) =>
    acc.concat("\n", Buffer.from(current).toString());
  return iterators.reduce(reducer);
}

export function isSql(fileName: string): boolean {
  const fileNameParts = fileName.split(".");
  return fileNameParts[fileNameParts.length - 1].toLowerCase() === "sql";
}
