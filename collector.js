const Steam = require('./takers/take-steam');
const DB = require('./database');

DB.connect({dbname: 'gamedb'}, init);

async function init() {

    await DB.games.deleteMany({});
    await DB.publishers.deleteMany({});
    await DB.developers.deleteMany({});
    await DB.genres.deleteMany({});
    await DB.features.deleteMany({});


    // ask steam parser to load list of games (id don't care about the cache)
    const games = await Steam.loadList();

    for (let i = 0; i < games.length; i++) {
        process.stdout.write((i + 1) + ' of ' + games.length + ' ');
        let game = await Steam.generateGame(games[i]);
    }

    process.exit()
}

