'use strict';
const request = require('request');
const iconv = require('iconv');

module.exports = (url, opts = {}) => new Promise((resolve, reject) => {
    let options = {
        url,
        method: opts.method || 'GET',
        encoding: "binary",
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    };
    if (opts.form) {
        options.form = opts.form;
    }
    const reqFunc = () => request(options, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            body = new Buffer(body, 'binary');
            let conv = new iconv.Iconv('ISO-8859-1', 'utf8');
            body = conv.convert(body).toString();
            resolve(body);
        } else {
            let code = response && response.statusCode;
            if (code) {
                console.error('Err', url, code, error);
                reject({error, response});
            } else {
                console.error('Err', url, options.form && JSON.stringify(options.form));
                setTimeout(reqFunc, 1000);
            }
        }
    });
    return reqFunc();
});
