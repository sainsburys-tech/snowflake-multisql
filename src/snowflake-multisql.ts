import { Snowflake, ConnectionOptions } from "snowflake-promise";
import { Mixin } from "ts-mixer";
import { EventEmitter } from "events";

export interface IPreview {
  chunkText: string;
  chunkOrder: number;
  chunksTotal: number;
  binds: any[];
}

export type data = Record<string, any>;
export interface IMultiSqlResult<T> extends IPreview {
  duration?: number;
  totalDuration?: number;
  data?: T[];
}

export type ITag = {
  tag: string;
  value: any;
};
export interface IExecuteAll {
  sqlText: string;
  tags?: ITag[];
  binds?: any[];
  preview?: boolean;
  includeResults?: boolean;
}
export class SnowflakeMultiSql extends Mixin(Snowflake, EventEmitter) {
  constructor(conn: ConnectionOptions) {
    super(conn);
  }
  public async executeAll<T>({
    sqlText,
    tags,
    preview,
    includeResults = false,
  }: IExecuteAll): Promise<IMultiSqlResult<T>[]> {
    const chunks = this.getChunks(sqlText);
    const chunksTotal = chunks.length;
    const results: IMultiSqlResult<T>[] = [];
    let totalDuration: number = 0;
    for (let _i = 0; _i < chunks.length; _i++) {
      if (chunks[_i].trim().length > 0) {
        const rawChunkText = chunks[_i];
        const { sqlText, binds } = this.tagsToBinds(rawChunkText, tags);

        const previewObj = {
          chunkText: sqlText,
          chunkOrder: _i + 1,
          chunksTotal,
          binds,
        };
        if (preview) {
          results.push(previewObj);
          this.emit("progress", previewObj);
        } else {
          const startTime: number = new Date().valueOf();
          const data = await this.execute(sqlText, binds);
          const duration = new Date().valueOf() - startTime;
          totalDuration += duration;

          const toPush: IMultiSqlResult<T> = {
            ...previewObj,
            duration,
            totalDuration,
          };
          if (includeResults) {
            toPush.data = data;
          }
          results.push(toPush);
          this.emit("progress", toPush);
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
   * Transforms nominal tags replacement into sequence as expected by the original library
   * @param sqlText
   * @param binds
   */
  public tagsToBinds(
    sqlText: string,
    tagValues: ITag[] = []
  ): { sqlText: string; binds: any[] } {
    try {
      const allRegex: RegExp = /{%\w+%}/gim;
      const ret = {
        sqlText,
        binds: [],
      };
      const rawTags = sqlText.match(allRegex) || [];
      const sqlTextTags: {
        raw?: string;
        clean?: string;
      }[] = rawTags.map((raw) => ({
        raw,
        clean: raw.replace("%}", "").replace("{%", ""),
      }));

      // sqlTextTags.clean = sqlTextTags.raw.map((t) => cleanTextTag(t));
      // const cleanTextTag = (textTag) =>
      //   textTag.replace("%}", "").replace("{%", "");

      const checkTags = (textTags: string[], tagValues: ITag[]) => {
        const uniqueTextTags = textTags.filter(
          (txtTag, i) => textTags.indexOf(txtTag) === i
        );
        // console.log(uniqueTextTags);
        uniqueTextTags.map((uniqueTag) => {
          if (!tagValues.find((tv) => tv.tag === uniqueTag))
            throw new Error(
              "###"
              // `it seems you've forgotten to list the tag ${uniqueTag}`
            );
        });
      };

      checkTags(
        sqlTextTags.map((tt) => tt.clean),
        tagValues
      );

      let _i = 0;
      sqlTextTags.forEach((textTag, _i) => {
        ret.sqlText = ret.sqlText.replace(
          textTag.raw,
          ":".concat(String(_i + 1))
        );
        const tagValue = tagValues?.find((obj) => obj.tag === textTag.clean);
        if (tagValue) ret.binds.push(tagValue?.value);
      });

      return ret;
    } catch (error) {
      throw error;
    }
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
