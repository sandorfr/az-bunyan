/**
 * Created by Cyprien on 26/10/2014.
 */
import azure = require("azure-storage");
import handlebars = require("handlebars");
import moment = require("moment");
import uuid = require("uuid");

handlebars.registerHelper("substring", (str: string, startIndex: number, count: number): string => str.substring(startIndex, count));
handlebars.registerHelper("momentFormat", (date: Date, format: string) => moment(date).format(format));
handlebars.registerHelper("newId", () => uuid.v4());

function tco(f: Function): Function {
    let value: any;
    let active = false;
    let accumulated: IArguments[] = [];

    return function accumulator() {
        accumulated.push(arguments);

        if (!active) {
            active = true;

            while (accumulated.length) {
                value = f.apply(this, accumulated.shift());
            }

            active = false;

            return value;
        }
    }
}

export interface ILogStreamDeclaration {
    level: string;
    stream: ILogStream;
    type?: string;
}

export interface ILogStream {
    write(obj: any): void;
    close(): void;
}

export interface IAzureStorageAccount {
    accountName: string;
    accessKey: string;
    host: string;
}

export interface IAzureOptions {
    connectionString?: string;
    storageAccountSettings?: IAzureStorageAccount;
    tableName: string;
    partitionKeyFormat?: string;
    rowKeyFormat?: string;
}

export class TableStorageStream implements ILogStream {
    private client: azure.TableService;
    private tableName: string;
    private partitionKeyBuilder: HandlebarsTemplateDelegate;
    private rowKeyBuilder: HandlebarsTemplateDelegate;

    constructor(options: IAzureOptions) {
        if (options.connectionString) {
            this.client = azure.createTableService(options.connectionString);
        } else if (options.storageAccountSettings) {
            this.client = azure.createTableService(options.storageAccountSettings.accountName, options.storageAccountSettings.accessKey, { primaryHost: options.storageAccountSettings.host });
        } else {
            throw new Error("Missing either a connection string or storage account settings");
        }
        this.tableName = options.tableName;

        if (!options.partitionKeyFormat) {
            options.partitionKeyFormat = '{{name}}_{{momentFormat time "YYYY-MM-DD-HH"}}';
        }
        this.partitionKeyBuilder = handlebars.compile(options.partitionKeyFormat);

        if (!options.rowKeyFormat) {
            options.rowKeyFormat = '{{newId}}'
        }

        this.rowKeyBuilder = handlebars.compile(options.rowKeyFormat);
    }

    write(obj: any): void {
        const entGen = azure.TableUtilities.entityGenerator;
        const entity = this.transform(obj, entGen);
        entity.RowKey = entGen.String(this.rowKeyBuilder(obj));
        entity.PartitionKey = entGen.String(this.partitionKeyBuilder(obj));

        this.client.insertEntity(this.tableName, entity, (error, result, response) => {
            if (error) {
                console.log(error);
            } else {
            }
        });

    }

    close(): void {
    }

    private sanitize(name: string): string {
        if (name) {
            return name.replace(/[^\w]/g, "");
        } else {
            return "empty";
        }
    }

    private transform(sourceObject: { [key: string]: any }, entGen: typeof azure.TableUtilities.entityGenerator): { [key: string]: any } {
        const output: { [key: string]: any } = {};

        const transformRecursive = tco((obj: { [key: string]: any }, transformPrefix: string) => {
            for (let prop in obj) {
                var value = obj[prop];
                var type = typeof obj[prop];
                var fullName = transformPrefix + this.sanitize(prop);

                if (type === 'object') {
                    if (obj[prop] instanceof Date) {
                        output[fullName] = entGen.String((<Date>value).toJSON());
                    } else {
                        transformRecursive(obj[prop], fullName);
                    }
                } else if (type === 'number') {
                    output[fullName] = entGen.Double((<number>value));
                } else if (type === 'string') {
                    output[fullName] = entGen.String((<string>value));
                }
            }
        });

        transformRecursive(sourceObject, "");

        return output;
    };
}

export function createTableStorageStream(level: string, options: IAzureOptions): ILogStreamDeclaration {
    return { level: level, stream: new TableStorageStream(options), type: "raw" };
}
