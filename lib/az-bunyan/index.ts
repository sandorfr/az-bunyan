/**
 * Created by Cyprien on 26/10/2014.
 */
///<reference path="../../typings/tsd.d.ts" />

var azure = require("azure-storage");
import handlebars = require("handlebars");
import moment = require("moment");
import uuid = require("node-uuid");

handlebars.registerHelper("substring", function (str:string, startIndex:number, count:number):string {
    return str.substring(startIndex, count);
});

handlebars.registerHelper("momentFormat", function (date:Date, format:string) {
    return moment(date).format(format);
});

handlebars.registerHelper("newId", function () {
    return uuid.v4();
});

function tco(f) {
    var value;
    var active = false;
    var accumulated = [];

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
    write(obj:any): void;
    close(): void;
}

export interface  IAzureStorageAccount {
    accountName:string;
    accessKey:string;
    host?:string;
}

export interface IAzureOptions {
    connectionString? : string;
    storageAccountSettings?: IAzureStorageAccount;
    tableName : string;
    partitionKeyFormat? : string;
    rowKeyFormat?: string;
}

export class TableStorageStream implements ILogStream {
    private client:any;
    private tableName:string;
    private partitionKeyBuilder:HandlebarsTemplateDelegate;
    private rowKeyBuilder:HandlebarsTemplateDelegate;
    private transform:TransformFunction;

    constructor(options:IAzureOptions) {
        if (options.connectionString) {
            this.client = azure.createTableService(options.connectionString);
        } else if (options.storageAccountSettings) {
            this.client = azure.createTableService(options.storageAccountSettings.accountName, options.storageAccountSettings.accessKey, options.storageAccountSettings.host)
        } else {
            throw new Error("Missing either a connection string or storage account settings")
        }
        this.tableName = options.tableName;

        if (!options.partitionKeyFormat) {
            options.partitionKeyFormat = '{{name}}_{{momentFormat time "YYYY-MM-DD-HH"}}';
        }
        this.partitionKeyBuilder = handlebars.compile(options.partitionKeyFormat);

        if (!options.rowKeyFormat) {
            options.rowKeyFormat = '{{newId}}'
        }

        var sanitize = (name:string):any=> {
            if (name) {
                return name.replace(/[^\w]/g, "");
            } else {
                return "empty";
            }
        };

        this.transform = (function () {

            var output:any = {};

            return function (obj:any, entGen:any):any {
                var transformRecursive = tco(function (obj:any, transformPrefix:string) {
                    for (var prop in obj) {
                        var value = obj[prop];
                        var type = typeof(obj[prop]);
                        var fullName = transformPrefix + sanitize(prop);

                        if (type === 'object') {
                            if (obj[prop] instanceof Date) {
                                output[fullName] = entGen.String((<Date>value).toJSON());
                            } else {
                                (<any>transformRecursive)(obj[prop], fullName);
                            }
                        } else if (type === 'number') {
                            output[fullName] = entGen.Double((<Number>value));
                        } else if (type === 'string') {
                            output[fullName] = entGen.String((<String>value));
                        }
                    }

                });

                (<any>transformRecursive)(obj, "");

                return output;
            };
        })();

        this.rowKeyBuilder = handlebars.compile(options.rowKeyFormat);
    }

    write(obj:any):void {
        var entGen = azure.TableUtilities.entityGenerator;
        var entity = this.transform(obj, entGen);
        entity.RowKey = entGen.String(this.rowKeyBuilder(obj));
        entity.PartitionKey = entGen.String(this.partitionKeyBuilder(obj));

        this.client.insertEntity(this.tableName, entity, function (error, result, response) {
            if (error) {
                console.log(error);
            } else {
            }
        });

    }

    close():void {
    }
}

export function createTableStorageStream(level:string, options:IAzureOptions):ILogStreamDeclaration {
    return {level: "info", stream: new TableStorageStream(options), type: "raw"};
}

export interface TransformFunction {
    (obj:any, entGen:any): any;
}
