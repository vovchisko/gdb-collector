const util = require('util');


class Take {
    constructor() {
        this.name = 'NO-NAME'
    }

    sleep(sec = 10) {
        return new Promise(resolve => setTimeout(resolve, Math.floor(sec * 1000)));
    }

    log() {
        let log = '';
        for (let i in arguments) {
            log += (util.format(arguments[i]) + ' ');
        }
        console.log(this.name + "~", log);
    }

    log_() {
        let log = '';
        for (let i in arguments) {
            log += (util.format(arguments[i]) + ' ');
        }
        process.stdout.write(this.name + " ~ " + log);
    }

    _log() {
        let log = '';
        for (let i in arguments) {
            log += (util.format(arguments[i]) + ' ');
        }
        process.stdout.write(log + "\n");
    }

    _log_() {
        let log = '';
        for (let i in arguments) {
            log += (util.format(arguments[i]) + ' ');
        }
        process.stdout.write(log);
    }

}

module.exports = Take;