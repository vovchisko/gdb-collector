const convert = {

    UP_CASE(x) {
        return x.toUpperCase();
    },

    LOW_CASE(x) {
        return x.toLowerCase();
    },

    toBool(x) {
        return !!x;
    },

};

/**
 * Create a copu of object, excluding all properties
 * that starts from '_', except '_id'
 * @return obj
 * @param obj
 */
function clean_clone(obj) {
    const clone = {};
    for (const i in obj) {
        if (i[0] === '_' && i !== '_id') continue; // skip
        if (obj[i] != null && typeof obj[i] === "object")
            clone[i] = clean_clone(obj[i]);
        else
            clone[i] = obj[i];
    }
    return clone;
}


async function pick(A, a, B, b, func = null, even_undef = false) {
    if (typeof A[a] === 'undefined' && !even_undef) return;
    if (typeof func === 'function') {
        B[b] = await func(A[a]);
    } else {
        B[b] = A[a];
    }
    return B;
}

async function  pickx(A, B) {
    let fields = [...arguments].slice(2);
    for (let i in fields) {
        await pick(A, fields[i][1], B, fields[i][1], fields[i][2], fields[i][3]);
    }
    return B;
}


module.exports.convert = convert;
module.exports.clean_clone = clean_clone;
module.exports.pick = pick;
module.exports.pickx = pickx;