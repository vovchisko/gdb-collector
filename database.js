'use strict';

const MongoClient = require('mongodb').MongoClient;
const shortid = require('shortid');
const crypto = require('crypto');
const extend = require('deep-extend');

class Database {
    constructor() {
        //databases links
        this._db = null;

        //database settings
        this.cfg = {
            host: '127.0.0.1',
            port: 56405,
            dbname: 'gameDatabase',
        };
    }


    connect(cfg, callback) {
        extend(this.cfg, cfg);
        MongoClient
            .connect('mongodb://' + this.cfg.host + ':' + this.cfg.port, {useNewUrlParser: true})
            .then(async (client) => {
                this._db = client.db(this.cfg.dbname);
                this.games = this._db.collection('games');
                this.publishers = this._db.collection('publishers');
                this.developers = this._db.collection('developers');
                this.genres = this._db.collection('genres');
                this.features = this._db.collection('features');

                callback();
            })
            .catch((err) => {
                console.error('DB::connect() Failed!', err);
                process.exit(-1);
            });
        return this;
    }

    /**
     * Generate ID
     * @returns {string}
     */
    id() {
        return shortid.generate();
    }

    some_hash() {
        return this.hash(Math.random().toString(36).substring(3) + Date.now());
    }

    hash(string) {
        return crypto.createHash('md5').update(string).digest('hex');
    }
}

const DB = new Database();
module.exports = DB;

