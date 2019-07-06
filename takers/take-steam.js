const axios = require('axios/index');
const fs = require('fs');
const Take = require('./take');


const CACHE_DIR = './cache/steam/';
const CACHE_GAMES_DIR = './cache/steam/games/';
const CACHE_GAMES_FILE = CACHE_DIR + 'AppList.json';
const API_GAMES_LIST = 'https://api.steampowered.com/ISteamApps/GetAppList/v2';
const API_GAME_DETAILS = 'https://store.steampowered.com/api/appdetails/?appids=';

// create cache folder, if not exists
fs.mkdirSync(CACHE_DIR, {recursive: true});
fs.mkdirSync(CACHE_GAMES_DIR, {recursive: true});


/*

The idea is that all collectors in some way might work differently,
but should have the same list of methods, so you can run it one by one
witout worrying how it works.


 */

const OK = '[ ok! ]';
const FROM_CACHE = '[ cache ]';
const CACHED = '[ saved! ]';
const FAILED = '[ FAIL! ]';


class SteamCollector extends Take {
    constructor() {
        super();

        this.name = 'STEAM';
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

            this.log_('cached games: ' + CACHE_GAMES_FILE);

            data = JSON.parse(fs.readFileSync(CACHE_GAMES_FILE).toString())

        } else {

            this.log_('requesting games: ' + API_GAMES_LIST);

            data = await axios.get(API_GAMES_LIST)
                .then(response => response.data)
                .catch(err => {throw err});

            fs.writeFileSync(CACHE_GAMES_FILE, JSON.stringify(data, null, 4));
            this._log_(CACHED);
        }

        this._log(OK);

        this.basicList.splice(0, this.basicList.length);
        const list = data.applist.apps;

        for (let i = 0; i < list.length; i++) {
            this.basicList.push({sources: {steam: list[i]}});
        }

        this.log('TOTAL RECORDS:', this.basicList.length, OK)

        return this.basicList;

    }

    /**
     * This method will try to find this game in loacal DB and
     * return it's record, or create new one if it's not exists
     *
     * @param {object} game
     * @param {object} collection
     * @param {boolean} update_rec
     * @param {boolean} update_cache
     */
    async generateGame(game, collection, update_rec = false, update_cache = false) {
        let rec = await collection.findOne({'sources.steam.appid': game.sources.steam.appid});
        if (rec && !update_rec) return rec;
        return await this._getGameById(game.sources.steam.appid, update_cache, game.sources.steam.name);
    }

    /**
     * It will find game in cache or from Steam
     * @param {number|string} steam_appid
     * @param {boolean} update_cache
     * @return {Promise<T>}
     * @private
     */
    async _getGameById(steam_appid, update_cache, display_name) {

        let response = null;

        const cache_file = CACHE_GAMES_DIR + steam_appid + '.json';
        const api_game_details = API_GAME_DETAILS + steam_appid;

        this.log_('#' + steam_appid);

        if (!update_cache && fs.existsSync(cache_file)) {
            response = JSON.parse(fs.readFileSync(cache_file).toString());
            this._log_(FROM_CACHE);
        } else {
            this._log_('GET');

            while (!response) {
                let req_error = null;
                response = await axios.get(api_game_details)
                    .then(res => res.data)
                    .catch((err, req, res) => {
                        req_error = err.message;
                        return null;
                    });
                if (!response) {
                    this._log_('.');
                    await this.sleep(60)
                }
            }

            if (response) {
                fs.writeFileSync(cache_file, JSON.stringify(response, null, 4));
                this._log_(CACHED);
            }
        }

        if (response && response[steam_appid] && response[steam_appid].success) {
            this._log(OK, display_name);
            return response[steam_appid].data;
        } else {
            this._log(FAILED, display_name);
            return null;
        }

    }


}

module.exports = new SteamCollector();