"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var azure = require("azure-storage");
var handlebars = require("handlebars");
var moment = require("moment");
var uuid = require("uuid");
var rotation_1 = require("./rotation");
handlebars.registerHelper('substring', function (str, startIndex, count) {
    return str.substring(startIndex, count);
});
handlebars.registerHelper('momentFormat', function (date, format) { return moment(date).format(format); });
handlebars.registerHelper('newId', function () { return uuid.v4(); });
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
    };
}
var TableStorageStream = (function () {
    function TableStorageStream(options) {
        if (options.connectionString) {
            this.client = azure.createTableService(options.connectionString);
        }
        else if (options.storageAccountSettings) {
            this.client = azure.createTableService(options.storageAccountSettings.accountName, options.storageAccountSettings.accessKey, { primaryHost: options.storageAccountSettings.host });
        }
        else {
            throw new Error('Missing either a connection string or storage account settings');
        }
        this.tableName = options.tableName;
        if (!options.partitionKeyFormat) {
            options.partitionKeyFormat = '{{name}}_{{momentFormat time "YYYY-MM-DD-HH"}}';
        }
        this.partitionKeyBuilder = handlebars.compile(options.partitionKeyFormat);
        if (!options.rowKeyFormat) {
            options.rowKeyFormat = '{{newId}}';
        }
        this.rowKeyBuilder = handlebars.compile(options.rowKeyFormat);
        if (options.logRotationOptions) {
            var _a = options.logRotationOptions, daysToKeep = _a.daysToKeep, cleanupIntervalHours = _a.cleanupIntervalHours;
            new rotation_1.TableStorageLogRotation({
                daysToKeep: daysToKeep,
                cleanupIntervalHours: cleanupIntervalHours,
                tableService: this.client,
                tableName: this.tableName
            });
        }
    }
    TableStorageStream.prototype.write = function (obj) {
        var entGen = azure.TableUtilities.entityGenerator;
        var entity = this.transform(obj, entGen);
        entity.RowKey = entGen.String(this.rowKeyBuilder(obj));
        entity.PartitionKey = entGen.String(this.partitionKeyBuilder(obj));
        this.client.insertEntity(this.tableName, entity, function (error, result, response) {
            if (error) {
                console.log(error);
            }
            else {
            }
        });
    };
    TableStorageStream.prototype.close = function () { };
    TableStorageStream.prototype.sanitize = function (name) {
        if (name) {
            return name.replace(/[^\w]/g, '');
        }
        else {
            return 'empty';
        }
    };
    TableStorageStream.prototype.transform = function (sourceObject, entGen) {
        var _this = this;
        var output = {};
        var transformRecursive = tco(function (obj, transformPrefix) {
            for (var prop in obj) {
                var value = obj[prop];
                var type = typeof obj[prop];
                var fullName = transformPrefix + _this.sanitize(prop);
                if (type === 'object') {
                    if (obj[prop] instanceof Date) {
                        output[fullName] = entGen.String(value.toJSON());
                    }
                    else {
                        transformRecursive(obj[prop], fullName);
                    }
                }
                else if (type === 'number') {
                    output[fullName] = entGen.Double(value);
                }
                else if (type === 'string') {
                    output[fullName] = entGen.String(value);
                }
            }
        });
        transformRecursive(sourceObject, '');
        return output;
    };
    return TableStorageStream;
}());
exports.TableStorageStream = TableStorageStream;
function createTableStorageStream(level, options) {
    return { level: level, stream: new TableStorageStream(options), type: 'raw' };
}
exports.createTableStorageStream = createTableStorageStream;
//# sourceMappingURL=index.js.map