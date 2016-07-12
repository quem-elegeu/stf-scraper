'use strict';
const fs = require('fs'),
    request = require('request'),
    iconv = require('iconv');

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

    request(options, (error, response, body) => {
        if (!error && response.statusCode === 200) {
            body = new Buffer(body, 'binary');
            let conv = new iconv.Iconv('ISO-8859-1', 'utf8');
            body = conv.convert(body).toString();
            resolve(body);
        } else {
            console.error('Err', url, response && response.statusCode);
            reject({error, response});
        }
    });
});
