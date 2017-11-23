"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var azure_storage_1 = require("azure-storage");
var moment = require("moment");
var TableStorageLogRotation = (function () {
    function TableStorageLogRotation(options) {
        this.cleanupIntervalHours = options.cleanupIntervalHours;
        this.daysToKeep = options.daysToKeep;
        this.tableName = options.tableName;
        this.tableService = options.tableService;
        this.bootstrap();
    }
    TableStorageLogRotation.prototype.bootstrap = function () {
        var _this = this;
        var cleanupIntervalMs = this.cleanupIntervalHours * 1000 * 60 * 60;
        setInterval(function () {
            _this.rotateLogEntities(null);
        }, cleanupIntervalMs);
    };
    TableStorageLogRotation.prototype.rotateLogEntities = function (continuationToken) {
        var _this = this;
        var tableQuery = this.getEntitiesCleanupQuery(this.daysToKeep);
        this.tableService.queryEntities(this.tableName, tableQuery, continuationToken, function (error, result, response) {
            if (error) {
                throw new Error("Log rotation: " + error);
            }
            var queryHasResults = result.entries && result.entries.length;
            if (queryHasResults) {
                var entries = result.entries, continuationToken_1 = result.continuationToken;
                _this.batchDeleteEntities(entries);
                if (result.continuationToken) {
                    _this.rotateLogEntities(continuationToken_1);
                }
            }
        });
    };
    TableStorageLogRotation.prototype.getEntitiesCleanupQuery = function (daysToKeep) {
        var cleanupAfterDate = moment().add(-daysToKeep, 'days').toDate();
        return new azure_storage_1.TableQuery().where(azure_storage_1.TableQuery.dateFilter('Timestamp', azure_storage_1.TableUtilities.QueryComparisons.LESS_THAN, cleanupAfterDate));
    };
    TableStorageLogRotation.prototype.batchDeleteEntities = function (entities) {
        var batch = new azure_storage_1.TableBatch();
        var entityCount = entities.length;
        var currentCount = 0;
        for (var i = currentCount; i < entityCount; i++) {
            var currPartitionKey = entities[currentCount].PartitionKey._;
            currentCount = i;
            if (currPartitionKey === entities[i].PartitionKey._) {
                batch.deleteEntity(entities[i]);
            }
            if (batch.size() === 100 || currPartitionKey !== entities[i].PartitionKey._) {
                break;
            }
        }
        if (batch.size() > 0) {
            this.tableService.executeBatch(this.tableName, batch, function (error, result) {
                if (error) {
                    throw new Error("Error in Execute Batch: " + error);
                }
            });
            var remainingEntities = entities.slice(currentCount + 1);
            if (remainingEntities.length) {
                this.batchDeleteEntities(remainingEntities);
            }
        }
    };
    return TableStorageLogRotation;
}());
exports.TableStorageLogRotation = TableStorageLogRotation;
//# sourceMappingURL=rotation.js.map