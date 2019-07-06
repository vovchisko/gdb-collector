const Steam = require('./takers/take-steam');
const DB = require('./models/database');

DB.connect({dbname: 'gamedb'}, init);

async function init() {

    // ask steam parser to load list of games (id don't care about the cache)
    const games = await Steam.loadList();

    for (let i = 0; i < games.length; i++) {
        let game = await Steam.generateGame(games[i], DB.games)
    }

    process.exit()
}

