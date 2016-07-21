'use strict';

const removeDiacritics = require('diacritics').remove;
const fs = require('fs');
const path = require('path');

let jqueryPath = path.join(__dirname, '..', 'node_modules', 'jquery', 'dist', 'jquery.js');
const jqueryFile = fs.readFileSync(jqueryPath, 'utf-8');

const jsdom = require('jsdom');
const download = require('./download');

module.exports = (url, name) => {
    let nameLower = removeDiacritics(name.toLowerCase()),
        words = nameLower.split(' '),
        initName = words.map(word => {
            if (~['da', 'de', 'do', 'el', 'il', 'la'].indexOf(word)) {
                return word;
            } else {
                return word[0];
            }
        }).join(' ');

    return download(url).then(html => new Promise(resolve => {
        jsdom.env({
            html,
            src: [jqueryFile],
            done: function (err, window) {
                let $ = window.jQuery,
                    title = $('#detalheProcesso strong').text(),
                    types = ['invest', 'indic', 'réu', 'qdo'],
                    list = $('#abaAcompanhamentoConteudoResposta tr');

                let subject = '',
                    names = [],
                    has = false;
                list.each(function() {
                    let elem = $('td:nth-child(1)', this);
                    if (!elem.length) {
                        return;
                    }
                    let key = elem.text().toLowerCase().trim();
                    if (types.some(type => key.indexOf(type) === 0)) {
                        let txt = $('td:nth-child(2)', this).text();
                        names.push(txt.trim());
                        let _name = removeDiacritics(txt.toLowerCase().replace(/\s/, ' ').trim());

                        if (_name === nameLower) {
                            has = true;
                        } else if (_name === initName) {
                            has = true;
                        } else if (~_name.indexOf(' ou ')) {
                            let _words = _name.split(' ou ');
                            _words.forEach(word => {
                                if (word === nameLower) {
                                    has = true;
                                } else if (word === initName) {
                                    has = true;
                                }
                            });
                        }
                        //if (!has) {
                        //    console.log('))))----', _name, '===', nameLower, '||', initName);
                        //}
                    } else if (key === 'assunto') {
                        subject = $('td:nth-child(2)', this).html();
                    }
                });
                resolve({url, name, title, subject, has, names});
            }
        });
    }));
};
