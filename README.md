az-bunyan
=========

az-bunyan provides azure storage streams for bunyan logger.

## Install az-bunyan

```
npm install az-bunyan --save
```

## Features

### Table storage stream

#### Basic sample

1. Create the stream

```
// define the target azure storage table name
var tableName = 'destinationTableName';

// define the connection string to your azure storage account
var connectionString = 'DefaultEndpointsProtocol=https;AccountName=storageAccountName;AccountKey=storageAccoutnKey;'

// initialize the az-bunyan table storage stream
var azureStream = azBunyan.createTableStorageStream('warning', {
    connectionString: connectionString,
    tableName: tableName
});
```

2. Add the stream to your bunyan logger

```
var logger = bunyan.createLogger({
    name: "yourLoggerName",
    streams: [
        azureStream
    ]
});
```

#### Custom partitionKey and rowKey

PartitionKey and rowKey are very important concepts of azure storage. Planning your your key strategy is very important
to ensure queryability and scalability of your logs.
We suggest that you read [this documentation](http://msdn.microsoft.com/en-us/library/azure/hh508997.aspx).

Az-bunyan comes with a default rowKey and partitionKey strategy, but we don't believe in the one size fits all when
it comes to that kind of point. So when you create your stream you can give custom key generation templates.

The templates are compiled with handlerbars so you should follow [handlebars syntax](http://handlebarsjs.com/).

```
var azureStream = azBunyan.createTableStorageStream('warning', {
    connectionString: connectionString,
    tableName: tableName
    partitionKeyFormat: "{{name}}_{{momentFormat time "YYYY-MM-DD"}}"
    rowKeyFormat: "{{#if correlationId}}{{correlationId}}{{else}}{{newId}}{{/if}}"
});
```

## Known limitations
* Since azure table only supports column names composed of alpha numeric characters, az-bunyan drops those characters
from property names. You should avoid logging an object with property names which differ only by special characters.

## Future features
* Blob Storage support
* Log rotation support

Feel free to suggest features or submit pull requests.