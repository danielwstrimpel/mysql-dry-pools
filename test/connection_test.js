'use strict';

var Q = require('q'),
    Connection = require('../lib/connection');

function getMockQueryConnection(results, error) {
    return new Connection({
        query: function (sql, values, callback) {
            callback(error, [results]);
        }
    });
}

function getMockTransactionConnection(errors) {
    errors = errors || {};

    return new Connection({
        query: function (sql, callback) {
            callback(errors.query);
        },
        beginTransaction: function (callback) {
            callback(errors.beginTransaction);
        },
        commit: function (callback) {
            callback(errors.commit);
        },
        rollback: function (callback) {
            callback(errors.rollback);
        }
    });
}

module.exports = {
    'constructor Tests' : {
        'it should initially set the internal flag to not have a transaction opened': function (test) {
            test.expect(1);
            
            var connection = new Connection();

            test.ok(!connection._hasOpenTransaction, 'Initially created with open transaction');

            test.done();
        },
        'it should initially set the internal flag to not have commits disabled': function (test) {
            test.expect(1);
            
            var connection = new Connection();

            test.ok(!connection._commitsDisabled, 'Initially created with commits disabled');

            test.done();
        }
    },
    'query Tests' : {
        'it should not suppress errors that occur from mysql query': function (test) {
            test.expect(1);

            var testError = new Error('Test Error');

            getMockQueryConnection(null, testError).query('SELECT * FROM user WHERE id IN (?,?)', [1,2])
            .fail(function (error) {
                test.ok(error === testError, 'The error from the query was suppressed');
            })
            .done(function () {
                test.done();
            });
        },
        'it should return promise of results of mysql query': function (test) {
            test.expect(1);

            var users = [{
                    'id': 1,
                    'username': 'test1'
                },
                {
                    'id': 2,
                    'username': 'test2'
                }];

            getMockQueryConnection(users).query('SELECT * FROM user WHERE id IN (?,?)', [1,2])
            .spread(function (results) {
                test.ok(results === users, 'The results failed to be passed back');
            })
            .done(function () {
                test.done();
            });
        }
    },
    'disableCommits Tests' : {
        'it should set the internal flag to disable commits': function (test) {
            test.expect(1);

            var connection = new Connection();
            connection.disableCommits();

            test.ok(connection._commitsDisabled, 'Commits not set to be disabled');

            test.done();
        },
        'it should not enable commits if called a second time': function (test) {
            test.expect(1);

            var connection = new Connection();
            connection.disableCommits();
            connection.disableCommits();

            test.ok(connection._commitsDisabled, 'Commits not set to be disabled');

            test.done();
        }
    },
    'transaction Tests' : {
        'it should begin transaction if no open transaction': function (test) {
            test.expect(1);

            var connection = getMockTransactionConnection(),
                beginTransaction = connection._connection.beginTransaction.bind(connection);
            
            connection._connection.beginTransaction = function (callback) {
                test.ok(true);

                beginTransaction(callback);
            };

            connection.transaction(function () {})
            .done(function () {
                test.done();
            });
        },
        'it should open a save point if a transaction is already open on the connection': function (test) {
            test.expect(1);

            var connection = getMockTransactionConnection(),
                savepoint = connection._savepoint.bind(connection);

            connection._savepoint = function (callback) {
                test.ok(true);

                return Q.fcall(function(){
                    return savepoint(callback);
                });
            };

            connection.transaction(function () {
                return connection.transaction(function () {});
            })
            .done(function () {
                test.done();
            });
        },
        'it should return promise of result of callback': function (test) {
            test.expect(1);

            var result = {},
                connection = getMockTransactionConnection();

            connection.transaction(function () {
                return result;
            })
            .then(function (response) {
                test.ok(response === result, 'The response from the transaction is incorrect');
            })
            .done(function () {
                test.done();
            });
        },
        'it should not suppress error from callback': function (test) {
            test.expect(1);

            var testError = new Error('Test Error'),
                connection = getMockTransactionConnection();

            connection.transaction(function () {
                throw testError;
            })
            .fail(function (error) {
                test.ok(error === testError, 'The error from the callback was suppressed');
            })
            .done(function () {
                test.done();
            });
        },
        'it should pass pool connection to callback': function (test) {
            test.expect(1);

            var connection = getMockTransactionConnection();

            connection.transaction(function (poolConnection) {
                test.ok(poolConnection, 'The pool connection was not passed to the callback');
            })
            .done(function () {
                test.done();
            });
        },
        'it should commit if commits not disabled': function (test) {
            test.expect(1);

            var connection = getMockTransactionConnection(),
                commit = connection._connection.commit.bind(connection);
            
            connection._connection.commit = function (callback) {
                test.ok(true);

                commit(callback);
            };

            connection.transaction(function () {})
            .done(function () {
                test.done();
            });
        },
        'it should rollback if commits disabled': function (test) {
            test.expect(1);

            var connection = getMockTransactionConnection(),
                rollback = connection._connection.rollback.bind(connection);
            
            connection._connection.rollback = function (callback) {
                test.ok(true);

                rollback(callback);
            };

            connection.disableCommits();

            connection.transaction(function () {})
            .done(function () {
                test.done();
            });
        },
        'it should rollback if callback throws error': function (test) {
            test.expect(1);

            var connection = getMockTransactionConnection(),
                rollback = connection._connection.rollback.bind(connection);
            
            connection._connection.rollback = function (callback) {
                test.ok(true);

                rollback(callback);
            };

            connection.transaction(function () {
                throw new Error('Test Error');
            })
            .fail(function () {})
            .done(function () {
                test.done();
            });
        },
        'it should end transaction when callback completed without error': function (test) {
            test.expect(2);

            var connection = getMockTransactionConnection(),
                beginTransaction = connection._connection.beginTransaction.bind(connection);
            
            connection._connection.beginTransaction = function (callback) {
                test.ok(true);

                beginTransaction(callback);
            };

            connection.transaction(function () {})
            .then(function () {
                return connection.transaction(function () {});
            })
            .done(function () {
                test.done();
            });
        },
        'it should end transaction when callback completed with error': function (test) {
            test.expect(2);

            var connection = getMockTransactionConnection(),
                beginTransaction = connection._connection.beginTransaction.bind(connection);
            
            connection._connection.beginTransaction = function (callback) {
                test.ok(true);

                beginTransaction(callback);
            };

            connection.transaction(function () {
                throw new Error('Test Error');
            })
            .fail(function () {
                return connection.transaction(function () {});
            })
            .done(function () {
                test.done();
            });
        },
        'it should end transaction when begin transaction had error': function (test) {
            test.expect(3);

            var testError = new Error('Test Error'),
                connection = getMockTransactionConnection({beginTransaction: testError}),
                beginTransaction = connection._connection.beginTransaction.bind(connection);
            
            connection._connection.beginTransaction = function (callback) {
                test.ok(true);

                beginTransaction(callback);
            };

            connection.transaction(function () {})
            .fail(function (error) {
                test.ok(error === testError, 'The begin transaction error was not thrown');
                
                return connection.transaction(function () {})
                .fail(function () {});
            })
            .done(function () {
                test.done();
            });
        },
        'it should end transaction when commit had error': function (test) {
            test.expect(3);

            var testError = new Error('Test Error'),
                connection = getMockTransactionConnection({commit: testError}),
                commit = connection._connection.commit.bind(connection);
            
            connection._connection.commit = function (callback) {
                test.ok(true);

                commit(callback);
            };

            connection.transaction(function () {})
            .fail(function (error) {
                test.ok(error === testError, 'The commit error was not thrown');
                
                return connection.transaction(function () {})
                .fail(function () {});
            })
            .done(function () {
                test.done();
            });
        },
        'it should end transaction when rollback from callback error had error': function (test) {
            test.expect(2);

            var testError = new Error('Test Error'),
                connection = getMockTransactionConnection({rollback: testError}),
                rollback = connection._connection.rollback.bind(connection);
            
            connection._connection.rollback = function (callback) {
                test.ok(true);

                rollback(callback);
            };

            connection.transaction(function () {
                throw new Error('Callback Error');
            })
            .fail(function (error) {
                test.ok(error === testError, 'The rollback error was not thrown');
                
                return connection.transaction(function () {});
            })
            .done(function () {
                test.done();
            });
        },
        'it should be able to handle many nested transactions': function (test) {
            test.expect(1);

            var connection = getMockTransactionConnection();

            connection.transaction(function (poolConnection) {
                return poolConnection.transaction(function (poolConnection) {
                    return poolConnection.transaction(function () {
                        return;
                    }, poolConnection)
                    .then(function () {
                        return poolConnection.transaction(function (poolConnection) {
                            return poolConnection.transaction(function () {
                                return;
                            }, poolConnection);
                        }, poolConnection);
                    });
                }, poolConnection);
            })
            .then(function () {
                test.ok(true);
            })
            .done(function () {
                test.done();
            });
        }
    },
    '_savepoint Tests' : {
        'it should': function (test) {
            //
            test.expect(1);
            test.done();
        }
    }
};