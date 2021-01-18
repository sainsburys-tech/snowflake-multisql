import { Snowflake, ConnectionOptions } from "snowflake-promise";

export interface ITag {
  tag: string;
  value: string;
}
export interface IPreview {
  chunkText: string;
  chunkOrder: number;
  chunksTotal: number;
}
export interface IMultiSqlResult extends IPreview {
  duration?: number;
  totalDuration?: number;
  data?: any[];
}
export class SnowflakeMultiSql extends Snowflake {
  constructor(conn: ConnectionOptions) {
    super(conn);
  }
  public async executeAll({
    sqlText,
    replace,
    binds,
    preview,
    includeResults = false,
  }: {
    sqlText: string;
    replace?: ITag[];
    binds?: any[];
    preview?: boolean;
    includeResults?: boolean;
  }): Promise<IMultiSqlResult[]> {
    const replaced = this.replaceTags(sqlText, replace);
    const chunks = this.getChunks(replaced);
    const chunksTotal = chunks.length;
    const results: IMultiSqlResult[] = [];
    let totalDuration: number = 0;
    for (let _i = 0; _i < chunks.length; _i++) {
      if (chunks[_i].trim().length > 0) {
        if (preview) {
          results.push({
            chunkText: chunks[_i],
            chunkOrder: _i + 1,
            chunksTotal,
          });
        } else {
          const startTime: number = new Date().valueOf();
          const data = await this.execute(chunks[_i], binds);
          const duration = new Date().valueOf() - startTime;
          totalDuration += duration;

          const topush: IMultiSqlResult = {
            chunkText: chunks[_i],
            chunkOrder: _i + 1,
            chunksTotal,
            duration,
            totalDuration,
          };
          if (includeResults) {
            topush.data = data;
          }
          results.push(topush);
        }
      }
    }
    return results;
  }

  /**
   * Tag Replacement alternative
   * replaces by name instead of sequence as per snowflake-sdk execute function
   * @param fileText
   * @param binds
   */
  public replaceTags(fileText: string, binds: ITag[]): string {
    let text: string = fileText;
    binds?.map((bind) => {
      const regex = new RegExp("{%" + bind.tag + "%}", "gi");
      text = text.replace(regex, bind.value);
    });
    return text;
  }

  /**
   * splits in chunks due to inability of Snowflake driver
   * to process multiple requests in a single call
   * @param script
   */
  private getChunks(script: string): string[] {
    const pure = this.minifySQL(this.removeComments(script));
    return pure
      .split(";")
      .map((chunk) => chunk.replace("\n", "").trim())
      .filter((chunk) => chunk.length > 0); // removes empty chunks
  }

  private minifySQL(sql: string): string {
    // Remove all tabs and line breaks
    sql = sql.replace(/("(""|[^"])*")|('(''|[^'])*')|([\t\r\n])/gm, (match) => {
      if (
        (match[0] === '"' && match[match.length - 1] === '"') ||
        (match[0] === "'" && match[match.length - 1] === "'")
      ) {
        return match;
      }
      return " ";
    });

    // Reduce all duplicate spaces
    sql = sql.replace(/("(""|[^"])*")|('(''|[^'])*')|([ ]{2,})/gm, (match) => {
      if (
        (match[0] === '"' && match[match.length - 1] === '"') ||
        (match[0] === "'" && match[match.length - 1] === "'")
      ) {
        return match;
      }
      return " ";
    });
    return sql.trim();
  }

  private removeComments(sql: string): string {
    sql = sql.replace(
      /("(""|[^"])*")|('(''|[^'])*')|(--[^\n\r]*)|(\/\*[\w\W]*?(?=\*\/)\*\/)/gm,
      (match) => {
        if (
          (match[0] === '"' && match[match.length - 1] === '"') ||
          (match[0] === "'" && match[match.length - 1] === "'")
        ) {
          return match;
        }
        // debug('comment removed: {\n%s\n}', match);
        return "";
      }
    );
    return sql;
  }
}
