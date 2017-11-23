import { TableBatch, TableService, TableUtilities, TableQuery } from 'azure-storage';
import * as moment from 'moment';

export interface IAzurTableStorageLogRotation {
	daysToKeep: number;
	cleanupIntervalHours: number;
}

export interface ITableStorageLogRotationOptions {
	cleanupIntervalHours: number;
	daysToKeep: number;
	tableName: string;
	tableService: TableService;
}

export class TableStorageLogRotation {
	private cleanupIntervalHours: number;
	private daysToKeep: number;
	private tableName: string;
	private tableService: TableService;

	constructor(options: ITableStorageLogRotationOptions) {
		this.cleanupIntervalHours = options.cleanupIntervalHours;
		this.daysToKeep = options.daysToKeep;
		this.tableName = options.tableName;
		this.tableService = options.tableService;

		this.bootstrap();
	}

	bootstrap() {
		const cleanupIntervalMs = this.cleanupIntervalHours * 1000 * 60 * 60;

		setInterval(() => {
			this.rotateLogEntities(null as any);
		}, cleanupIntervalMs);
	}

	private rotateLogEntities(continuationToken: TableService.TableContinuationToken): void {
		const tableQuery = this.getEntitiesCleanupQuery(this.daysToKeep);

		this.tableService.queryEntities(
			this.tableName,
			tableQuery,
			continuationToken,
			(error: any, result: any, response: any) => {
				if (error) {
					throw new Error(`Log rotation: ${error}`);
				}

				const queryHasResults = result.entries && result.entries.length;

				if (queryHasResults) {
					const { entries, continuationToken } = result;

					this.batchDeleteEntities(entries);

					if (result.continuationToken) {
						this.rotateLogEntities(continuationToken);
					}
				}
			}
		);
	}

	private getEntitiesCleanupQuery(daysToKeep: number): TableQuery {
		const cleanupAfterDate = moment().add(-daysToKeep, 'days').toDate();

		return new TableQuery().where(
			TableQuery.dateFilter('Timestamp', TableUtilities.QueryComparisons.LESS_THAN, cleanupAfterDate)
		);
	}

	private batchDeleteEntities(entities: any[]): void {
		const batch = new TableBatch();

		const entityCount = entities.length;
		let currentCount = 0;

		for (let i = currentCount; i < entityCount; i++) {
			const currPartitionKey = entities[currentCount].PartitionKey._;

			currentCount = i;

			if (currPartitionKey === entities[i].PartitionKey._) {
				batch.deleteEntity(entities[i]);
			}

			if (batch.size() === 100 || currPartitionKey !== entities[i].PartitionKey._) {
				break;
			}
		}

		if (batch.size() > 0) {
			this.tableService.executeBatch(this.tableName, batch, (error: any, result: any) => {
				if (error) {
					throw new Error(`Error in Execute Batch: ${error}`);
				}
			});

			const remainingEntities = entities.slice(currentCount + 1);
			if (remainingEntities.length) {
				this.batchDeleteEntities(remainingEntities);
			}
		}
	}
}
