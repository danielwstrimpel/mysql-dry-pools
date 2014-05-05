# mysql-dry-pools

## WORK IN PROGRESS

This library is not meant for general consumptions yet.

## Install

```bash
npm install mysql-dry-pools
```

## License

The library is released under the MIT license.

## Introduction

The library's fundamental concept is to provide a more DRY (don't-repeat-yourself) way of using the node-mysql library with pooled connections, promises and nested transactions.

Here is an example on how to use it:

```js
var MysqlDryPool = require('mysql-dry-pools');
var pool = new MysqlDryPool({
    host: 'localhost',
    user: 'me',
    password: 'secret'
});

pool.transaction(function (poolConnection) {
    return poolConnection.transaction(function (poolConnection) {
        return poolConnection.query('SELECT 1 + 1 AS solution')
        .spread(function (results) {
            return results[0].solution;
        });
    });
})
.then(function (solution) {
    console.log(solution);
})
.done();
```

The following are philosphies and issues that the library is built around:

* The best way to develop software is to follow the DRY (don't-repeat-yourself) philosophy. Handling connections and transactions with the mysql library consists of many examples of code that is repeated throughout the application logic. To resolve this, classes should be created to handle the portions that are unnecessarily repeated.
* Promises are better than using node-style callbacks to notify of completion of operations.
* In order to use transactions in a multiple concurrent user application, a single connection cannot be used, therefore pooled connections must be used instead.
* Mysql does not allow for nested transactions, but does allow for save points nested on a single transaction.

## Pool Creation

The following is the constructor for creating new pools:

```js
/**
 * @constructor
 * @param {!Object} configuration The mysql configuration.
 */
function Pool(configuration) {}
```

The only parameter that needs to be passed in is the mysql configuration to use for the pool. Refer to the documentation for the mysql library [connection options](https://github.com/felixge/node-mysql/#connection-options) for details on the options that can be configured.

The library introduces one new additional parameter for the connection options:

* `disableCommits`: Disables commits of transactions on any connections. This should only be used while testing to prevent persisting to the DB. (Default: `false`)

The preferred way to use connection pooling is to have a single global pool that is used. The following can be saved to a file `db-pool.js` and be included anywhere that a connection to the database is needed via a `require` statement.

```js
'use strict';

var Pool = require('mysql-dry-pools');

module.exports = new Pool({
    host: 'localhost',
    user: 'me',
    password: 'secret'
});
```

## Transactions

Discuss how library handles starting/ending transactions and how the transactions can be created on the pool or pool connection. Detail the function signature of the callbacks passed to the transaction methods.

Once a pool is created, transactions can be created and ran on a connection. To run a transaction, you simply call the `transaction` method on a pool. This will open up a new connection and run the transaction on it. The code to do this will look like the following:

```js
var pool = require('./db-pool');

pool.transaction(function (poolConnection) {
    // run any code on the pool connection
});
```

The library handles all necessary actions to open and close the connections that the transaction will run on. Regardless of whether the code inside of a transaction completes successfully or throws an error, the connection will be properly closed.

The same is true for the database transaction that is opened. The library ensures that the transaction is properly committed or rolled back.

The library does error-based rollbacks - meaning that if the code ran inside of the transaction throws an error, the transaction will be rolled back. For example, the following will cause the transaction to be rolled back:

```js
pool.transaction(function (poolConnection) {
    throw new Error('Test Error');
});
```

The library will not suppress the errors that are thrown from within the transaction callback. The following will get the error thrown and log it to the console:

```js
pool.transaction(function (poolConnection) {
    throw new Error('Test Error');
})
.fail(function (error) {
    console.log(error); // will log 'Test Error' to the console
});
```

If the code within a transaction callback completes successfully the library will commit the transaction. The only exception to this is if the commits are disabled on the connection. This can be done via the `disableCommits` connection options setting or by manually calling the `disableCommits` method on the pool connection.

There is no mechanism in the library for the developer to manage the transaction and do commits or rollbacks manually.

Since the library is promise-based, the expectation is that the callback method passed to the `transaction` method returns a promise. The following is the method signature of the `transaction` function's `callback` parameter:

```js
/**
 * @param {!Connection} poolConnection The library's pool connection for this transaction.
 * @returns {!Q.Promise.<*>} Returns a promise for the result from the transaction.
 */
function (poolConnection) {}
```













## Nested Transactions

Discuss how library handles starting/ending savepoints.

## Queries

Discuss how library allows query on pool or pool connection. Detail how should use spread method after calling query.

## Testing

Discuss how to test without committing transactions.