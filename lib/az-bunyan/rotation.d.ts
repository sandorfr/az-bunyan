import { TableService } from 'azure-storage';
export interface IAzurTableStorageLogRotation {
    daysToKeep: number;
    cleaupIntervalHours: number;
}
export interface TableStorageLogRotationOptions {
    cleanupInterval: number;
    daysToKeep: number;
    tableName: string;
    tableService: TableService;
}
export declare class TableStorageLogRotation {
    private cleanupInterval;
    private daysToKeep;
    private tableName;
    private tableService;
    constructor(options: TableStorageLogRotationOptions);
    bootstrap(): void;
    private performLogRotation(continuationToken);
    private getEntitiesCleanupQuery(daysToKeep);
    private performDelete(entities);
}
