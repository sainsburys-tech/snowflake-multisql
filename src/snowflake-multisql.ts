import { Snowflake, ConnectionOptions } from "snowflake-promise";
import { EventEmitter } from "events";

export type IExecuteAllPreview = {
  chunkText: string;
  chunkOrder: number;
  chunksTotal: number;
  binds: any[];
};

export type IExecuteAllResult<T> = IExecuteAllPreview & {
  duration?: number;
  totalDuration?: number;
  data?: T[];
};

export type ITag = {
  tag: string;
  value: any;
  inline?: boolean;
};
export type IExecuteAll = {
  sqlText: string;
  tags?: ITag[];
  binds?: any[];
  preview?: boolean;
  includeResults?: boolean;
};

export class SnowflakeMultiSql extends Snowflake {
  public readonly progress = new EventEmitter();
  constructor(conn: ConnectionOptions) {
    super(conn);
  }

  //public replaceInlineTags(fileText: string, binds: ITag[]): string {
  private replaceInlineTags(params: IExecuteAll): IExecuteAll {
    let text: string = params.sqlText;
    params.tags = params.tags || [];
    const inlineTags = params.tags.filter((tag) => tag.inline);
    inlineTags?.map((bind) => {
      const regex = new RegExp("{%" + bind.tag + "%}", "gi");
      params.sqlText = params.sqlText.replace(regex, bind.value);
    });
    params.tags = params.tags.filter((tag) => !tag.inline);
    return params;
  }

  public async executeAll<T = Record<string, string>>(
    params: IExecuteAll
  ): Promise<IExecuteAllResult<T>[]> {
    this.replaceInlineTags(params);
    const chunks = this.getChunks(params.sqlText);
    const chunksTotal = chunks.length;
    const results: IExecuteAllResult<T>[] = [];
    let totalDuration: number = 0;
    for (let _i = 0; _i < chunks.length; _i++) {
      if (chunks[_i].trim().length > 0) {
        const rawChunkText = chunks[_i];
        const { sqlText, binds } = this.tagsToBinds(rawChunkText, params.tags);

        const previewObj: IExecuteAllPreview = {
          chunkText: sqlText,
          chunkOrder: _i + 1,
          chunksTotal,
          binds,
        };
        if (params.preview) {
          results.push(previewObj);
          this.progress.emit("news", previewObj);
        } else {
          const startTime: number = new Date().valueOf();
          const data = await this.execute(sqlText, binds);
          const duration = new Date().valueOf() - startTime;
          totalDuration += duration;

          const toPush: IExecuteAllResult<T> = {
            ...previewObj,
            duration,
            totalDuration,
          };
          if (params.includeResults) {
            toPush.data = data;
          }
          results.push(toPush);
          this.progress.emit("news", toPush);
        }
      }
    }
    return results;
  }

  /**
   * Transforms nominal tags replacement into sequence as expected by the original library
   * @param sqlText
   * @param binds
   */
  public tagsToBinds(
    sqlText: string,
    tags: ITag[] = []
  ): { sqlText: string; binds: any[] } {
    try {
      const ret = { sqlText, binds: [] };
      const rawTags = sqlText.match(/{%\w+%}/gim) || [];
      const sqlTextTags: {
        raw?: string;
        clean?: string;
      }[] = rawTags.map((raw) => ({
        raw,
        clean: raw.replace("%}", "").replace("{%", ""),
      }));

      let _i = 0;
      sqlTextTags.forEach((textTag, _i) => {
        ret.sqlText = ret.sqlText.replace(
          textTag.raw,
          ":".concat(String(_i + 1))
        );
        const tagValue = tags?.find((obj) => obj.tag === textTag.clean);
        if (tagValue) ret.binds.push(tagValue?.value);
      });

      return ret;
    } catch (error) {
      throw error;
    }
  }

  private checkTagsExistence(
    sqlTextTags: { raw?: string; clean?: string }[],
    tagValues: ITag[]
  ) {
    const checkTags = (textTags: string[], tagValues: ITag[]) => {
      const uniqueTextTags = textTags.filter(
        (txtTag, i) => textTags.indexOf(txtTag) === i
      );
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
