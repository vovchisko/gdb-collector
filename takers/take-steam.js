const _ = require("lodash");
const axios = require("axios/index");
const fs = require("fs");

const Take = require("./take");
const DB = require('../database');
const tools = require("../tools");

const CACHE_DIR = "./cache/steam/";
const CACHE_GAMES_DIR = "./cache/steam/games/";
const CACHE_GAMES_FILE = CACHE_DIR + "AppList.json";
const API_GAMES_LIST = "https://api.steampowered.com/ISteamApps/GetAppList/v2";
const API_GAME_DETAILS =
    "https://store.steampowered.com/api/appdetails/?appids=";


// create cache folder, if not exists
fs.mkdirSync(CACHE_DIR, {recursive: true});
fs.mkdirSync(CACHE_GAMES_DIR, {recursive: true});

/*

The idea is that all collectors in some way might work differently,
but should have the same list of methods, so you can run it one by one
witout worrying how it works.

 */

const OK = "[ ok! ]";
const FROM_CACHE = "[ cache ]";
const CACHED = "[ saved! ]";
const FAILED = "[ FAIL! ]";

class SteamCollector extends Take {
    constructor() {
        super();

        this.name = "steam";
        this.offset = 0;
        this.basicList = [];
    }

    /**
     *  It will grab list of games from Steam, and store int in .basicList
     *  It also can cache itself.
     */
    async loadList(update_cache = false) {
        let data;

        if (!update_cache && fs.existsSync(CACHE_GAMES_FILE)) {
            this.log_("cached games: " + CACHE_GAMES_FILE);

            data = JSON.parse(fs.readFileSync(CACHE_GAMES_FILE).toString());
        } else {
            this.log_("requesting games: " + API_GAMES_LIST);

            data = await axios
                .get(API_GAMES_LIST)
                .then(response => response.data)
                .catch(err => {
                    throw err;
                });

            fs.writeFileSync(CACHE_GAMES_FILE, JSON.stringify(data, null, 4));
            this._log_(CACHED);
        }

        this._log(OK);

        this.basicList.splice(0, this.basicList.length);
        const list = data.applist.apps;

        for (let i = 0; i < list.length; i++) {
            this.basicList.push(list[i]);
        }

        this.log("TOTAL RECORDS:", this.basicList.length, OK);

        return this.basicList;
    }

    /**
     * This method will try to find this game in loacal DB and
     * return it's record, or create new one if it's not exists
     *
     * @param {object} list_item
     * @param {boolean} update_rec
     * @param {boolean} update_cache
     */
    async generateGame(list_item, update_rec = true, update_cache = false) {
        let rec = await DB.games.findOne({
            "sources.steam.appid": list_item.appid
        });

        if (rec && rec._id && !update_rec) return rec;

        const steam_game = await this._getGameById(
            list_item.appid,
            update_cache,
            list_item.name
        );

        if (!steam_game) return null

        if (!rec) rec = {
            _id: DB.id(),
            sources: {
                steam: {...list_item}
            }
        };

        await this.mapSteamToGameRec(steam_game, rec);

        await DB.games.replaceOne({_id: rec._id}, rec, {upsert: true});


        return rec;
    }

    async mapSteamToGameRec(steam_game, local_record) {
        // let's collect basic primitive values

        await tools.pickx(steam_game, local_record,
            ['name', 'name'],
            ['type', 'name', tools.convert.LOW_CASE],
            ['is_free', 'is_free'],
            ['required_age', 'required_age'],
            ['platforms', 'platforms'],
            ['release_date', 'release'],
            ['screenshots', 'screenshots', screenshots => screenshots.map(s => { return {thumb: s.path_thumbnail, full: s.path_full} })],
            ['movies', 'videos', movies => movies.map(m => {return {name: m.name, thumb: m.thumbnail, src: m.webm}})],
            ['publishers', 'publishers', async (pubs) => {
                let ids = [];
                for (let i in pubs) {
                    if (!!pubs[i]) {
                        let p = await this.getPublisher(pubs[i])
                        ids.push(p._id)
                    }
                }
                return ids

            }],
            ['developers', 'developers', async (devs) => {
                let ids = [];
                for (let i in devs) {
                    if (!!devs[i]) {
                        let p = await this.getDeveloper(devs[i])
                        ids.push(p._id)
                    }
                }
                return ids

            }],
            ['categories', 'features', async (features) => {
                // categories are very redicilous on steam
                // and can't be used as categories at all.
                let ids = [];
                for (let i in features) {
                    if (!!features[i]) {
                        let p = await this.getFeature(features[i]);
                        ids.push(p._id)
                    }
                }
                return ids

            }],
            ['genres', 'genres', async (raw_genres) => {
                let genres = {};
                for (let i in raw_genres) {
                    if (!!raw_genres[i]) {
                        // todo: for some reason indie is a genre on steam.
                        //       I believe it should be a flag
                        let p = await this.getGenre(raw_genres[i]);
                        genres[p._id] = 0.5
                    }
                }
                return genres

            }]
        );

    }

    /**
     * Find publisher by name or create one
     * @param name
     * @return {Promise<T>}
     */
    async getPublisher(name) {
        let publisher = await DB.publishers.findOne({name});
        if (!publisher) {
            publisher = {_id: DB.id(), name: name};
            await DB.publishers.insertOne(publisher)
        }
        return publisher
    }

    /**
     * Find developer by name or create one
     * @param name
     * @return {Promise<T>}
     */
    async getDeveloper(name) {
        let dev = await DB.developers.findOne({name});
        if (!dev) {
            dev = {_id: DB.id(), name: name};
            await DB.developers.insertOne(dev)
        }
        return dev
    }


    /**
     * Find category by steam category ID or create one with steam .name and .id
     * @param {Object} steamCategory
     * @return {Promise<T>}
     */
    async getFeature(steamCategory) {
        let category = await DB.features.findOne({steam_id: steamCategory.id});
        // todo: later we also need to find existing feature by name, maybe from another platform. and mark it
        if (!category) {
            category = {_id: DB.id(), name: steamCategory.description, steam_id: steamCategory.id};
            await DB.features.insertOne(category)
        }
        return category
    }

    /**
     * Find genre by steam genre ID or create one with steam name and id
     * @param name
     * @return {Promise<T>}
     */
    async getGenre(steamGenre) {
        let genre = await DB.genres.findOne({name: steamGenre.id});
        // todo: later we also need to find existing genres by name as well
        if (!genre) {
            genre = {_id: DB.id(), name: steamGenre.description, steam_id: steamGenre.id};
            await DB.genres.insertOne(genre)
        }
        return genre
    }


    /**
     * It will find game in cache or from Steam
     * @param {number|string} steam_appid
     * @param {boolean} update_cache
     * @param {string} display_name actually do nothng, just display string in log
     * @return {Promise<T>}
     * @private
     */
    async _getGameById(steam_appid, update_cache, display_name) {
        let response = null;

        const cache_file = CACHE_GAMES_DIR + steam_appid + ".json";
        const api_game_details = API_GAME_DETAILS + steam_appid;

        this.log_("#" + steam_appid);

        if (!update_cache && fs.existsSync(cache_file)) {
            response = JSON.parse(fs.readFileSync(cache_file).toString());
            this._log_(FROM_CACHE);
        } else {
            this._log_("GET");

            while (!response) {
                let req_error = null;
                response = await axios
                    .get(api_game_details)
                    .then(res => res.data)
                    .catch((err, req, res) => {
                        req_error = err.message;
                        return null;
                    });
                if (!response) {
                    this._log_(".");
                    await this.sleep(60);
                }
            }

            if (response) {
                fs.writeFileSync(cache_file, JSON.stringify(response, null, 4));
                this._log_(CACHED);
            }
        }

        if (
            response &&
            response[steam_appid] &&
            response[steam_appid].success
        ) {
            this._log(OK, display_name);
            return response[steam_appid].data;
        } else {
            this._log(FAILED, display_name);
            return null;
        }
    }
}


module.exports = new SteamCollector();
