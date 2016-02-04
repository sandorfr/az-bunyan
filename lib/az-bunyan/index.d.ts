/// <reference path="../../typings/tsd.d.ts" />
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
    host?: string;
}
export interface IAzureOptions {
    connectionString?: string;
    storageAccountSettings?: IAzureStorageAccount;
    tableName: string;
    partitionKeyFormat?: string;
    rowKeyFormat?: string;
}
export declare class TableStorageStream implements ILogStream {
    private client;
    private tableName;
    private partitionKeyBuilder;
    private rowKeyBuilder;
    private transform;
    constructor(options: IAzureOptions);
    write(obj: any): void;
    close(): void;
}
export declare function createTableStorageStream(level: string, options: IAzureOptions): ILogStreamDeclaration;
export interface TransformFunction {
    (obj: any, entGen: any): any;
}
