'use strict';

var Q = require('q'),
	mysql = require('mysql'),
    Connection = require('./connection');

/**
 * Mysql connection pool using promises, with advanced support for transactions.
 * 
 * @constructor
 * @param {!Object} configuration The mysql configuration.
 * @param {Object} options The dependencies to pass in (optional).
 */
function Pool(configuration, options) {
    options = options || {};

    this._configuration = configuration;
    this._pool = options.pool || mysql.createPool(configuration);
}

Pool.prototype.query = function (sql, values, poolConnection) {
    if (poolConnection) {
        return poolConnection.query(sql, values);
    }

    return Q.ninvoke(this._pool, 'query', sql, values);
};

Pool.prototype.transaction = function (callback, poolConnection) {
    return this._processOnSingleConnection(function (poolConnection) {
        return poolConnection.transaction(callback);
    }, poolConnection);
};

Pool.prototype._processOnSingleConnection = function (callback, poolConnection) {
    var mysqlPool = this._pool,
        configuration = this._configuration;

    if (poolConnection) {
        return Q.fcall(function () {
            return callback(poolConnection);
        });
    }

    return Q.ninvoke(mysqlPool, 'getConnection')
    .then(function (connection) {
        return Q.fcall(function () {
            var poolConnection = new Connection(connection);

            if (configuration.disableCommits) {
                poolConnection.disableCommits();
            }

            return callback(poolConnection);
        })
        .then(function (result) {
            connection.release();

            return result;
        })
        .fail(function (error) {
            connection.release();

            throw error;
        });
    });
};

module.exports = Pool;