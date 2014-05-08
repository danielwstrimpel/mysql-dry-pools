'use strict';

var Q = require('q');

function Connection(connection) {
    this._connection = connection;
    this._commitsDisabled = false;
    this._hasOpenTransaction = false;
    this._numSavepoints = 0;
}

Connection.prototype.query = function (sql, values) {
    return Q.ninvoke(this._connection, 'query', sql, values);
};

Connection.prototype.disableCommits = function () {
    this._commitsDisabled = true;
};

Connection.prototype.transaction = function (callback) {
    var poolConnection = this,
        connection = this._connection;

    // can't nest transactions in Mysql, use savepoint instead
    if (poolConnection._hasOpenTransaction) {
        return this._savepoint(callback);
    }

    return Q.ninvoke(connection, 'beginTransaction')
    .then(function () {
        poolConnection._hasOpenTransaction = true;

        return Q.fcall(function () {
            return callback(poolConnection);
        })
        .then(function (result) {
            var action = poolConnection._commitsDisabled ? 'rollback' : 'commit';

            return Q.ninvoke(connection, action)
            .then(function () {
                poolConnection._hasOpenTransaction = false;

                return result;
            });
        })
        .fail(function (error) {
            return Q.ninvoke(connection, 'rollback')
            .then(function () {
                throw error;
            });
        });
    })
    .fail(function (error) {
        poolConnection._hasOpenTransaction = false;

        throw error;
    });
};

Connection.prototype._savepoint = function (callback) {
    var poolConnection = this,
        savepointNum = ++this._numSavepoints,
        connection = this._connection;

    return Q.ninvoke(connection, 'query', 'SAVEPOINT savepoint' + savepointNum)
    .then(function () {
        return Q.fcall(function () {
            return callback(poolConnection);
        })
        .then(function (result) {
            return Q.ninvoke(connection, 'query', 'RELEASE SAVEPOINT savepoint' + savepointNum)
            .then(function () {
                return result;
            });
        })
        .fail(function (error) {
            return Q.ninvoke(connection, 'query', 'ROLLBACK TO SAVEPOINT savepoint' + savepointNum)
            .then(function () {
                throw error;
            });
        });
    })
    .fail(function (error) {
        throw error;
    });
};

module.exports = Connection;