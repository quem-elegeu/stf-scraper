'use strict';
const fs = require('fs');
const path = require('path');
const removeDiacritics = require('diacritics').remove;
const changeCase = require('change-case');

let jqueryPath = path.join(__dirname, '..', 'node_modules', 'jquery', 'dist', 'jquery.js');
const jqueryFile = fs.readFileSync(jqueryPath, 'utf-8');

const jsdom = require('jsdom');
const download = require('./download');
const queue = require('./queue')();

const processDetails = require('./process-details');
module.exports = (person) => {
    let process = {
        name: (person.name || person.fullName || person.shortName),
        nick: '',
        path: '',
        email: person.email,
        party: person.party,
        state: person.state,
        list: []
    };

    let opts = {
        method: 'POST',
        form: {
            numero: escape(process.name.replace(/ /g,'+')),
            dropmsgoption: 4,
            partesAdvogadosRadio: 1
        }
    };
    let nameLower = removeDiacritics(process.name.toLowerCase()),
        words = nameLower.split(' '),
        initName = words.map(word => {
            if (~['da', 'de', 'do', 'el', 'il', 'la'].indexOf(word)) {
                return word;
            } else {
                return word[0];
            }
        }).join(' ');
    let promise = download('http://www.stf.jus.br/portal/processo/listarProcessoParte.asp', opts);
    return promise.then(html => new Promise(resolve => jsdom.env({
        html,
        src: [jqueryFile],
        done: function (err, window) {
            let $ = window.jQuery,
                options = $('#listaPartes option');

            let htmls = [],
                promise = Promise.resolve();
            options.each(function(i) {
                let elem = $(this),
                    txt = elem.text().trim();
                let _name = removeDiacritics(txt.toLowerCase().replace(/\s/, ' ').trim()),
                    has = false;
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
                if (has) {
                    promise = promise.then(() => new Promise(resolve => setTimeout(() => {
                        download('http://www.stf.jus.br/portal/processo/verProcessoParte.asp', {
                            method: 'post',
                            form: {listaPartes: elem.attr('value')}
                        }).then(html => {
                            htmls.push(html);
                            return resolve();
                        }).catch(() => {
                            return resolve();
                        });
                    }, 100)));
                }
            });

            return promise.then(() => resolve(htmls));
        }
    }))).then(htmls => {
        let promises = [];
        for (let i=0; i<htmls.length; i++ ){
            let html = htmls[i];
            if (!html) continue;
            let prom = new Promise(resolve => jsdom.env({
                html,
                src: [jqueryFile],
                done: function (err, window) {
                    let $ = window.jQuery,
                        lines = $('#resultadoAcompanhamentoProcesso tr');

                    let list = [];
                    let baseUrl = 'http://www.stf.jus.br/portal/processo/';
                    lines.each(function() {
                        let elem = $('td:nth-child(1) a', this);
                        if (!elem.length) {
                            return;
                        }
                        let val = elem.text().toLowerCase().trim();
                        if (val.indexOf('inq/') === 0 || val.indexOf('ap/') === 0) {
                            let ss = val.split('/');
                            let txt = $('td:nth-child(2)', this).text(),
                                desc = txt.split('|');
                            if (desc.length > 1) {
                                txt = desc[desc.length-1];
                            }
                            list.push({
                                type: ss[0] === 'ap' ? 'Ação Penal' : 'Inquérito',
                                code: ss[1],
                                link: baseUrl + elem.attr('href').trim(),
                                desc: txt.trim()
                            });
                        }
                    });

                    resolve(list);
                }
            }));
            promises.push(prom);
        }
        return Promise.all(promises);
    }).then(data => {
        for (let i=0; i<data.length; i++) {
            let datum = data[i];
            if (!datum || !datum.length) {
                continue;
            }
            process.list.push(...datum);
        }

        //console.log('Finish', process.name, process.list.length);
        let promises = process.list.map(item => queue(() => processDetails(item.link, process.name)));
        return Promise.all(promises);
    }).then(details => {

        for (let i=0; i<details.length; i++) {
            let item = process.list[i],
                res = details[i];
            if (!~res.title.indexOf(item.code)) {
                console.log(`Invalid title[${item.code}]: ${res.title}`);
                continue;
            }
            item.valid = res.has;
            //item.names = res.names;
            //item.title = res.title;
            //item.subject = res.subject;
            if (res.subject) {
                item.desc = res.subject.split('<br>').map(p => {
                    let words = p.split('|'),
                        desc;
                    if (words.length) {
                        for (let o=words.length; o>0 && !desc; o--) {
                            let word = (words[o-1] || '').replace(/<[\/]?[\w]+>/g, '').trim();
                            if (word.length) desc = changeCase.title(word);
                        }
                    }
                    return desc;
                }).filter(p => p && p.trim().length).map(p => p.trim()).join(' | ');
            }
            if (!item.desc || !item.desc.trim().length) {
                item.desc = '- Sem Descrição - ';
            }
            //console.log('Finish', person.name, item.valid, item.link);
        }
        return process;
    }).catch(err => {
        console.error(err, err.stack);
    });
};
