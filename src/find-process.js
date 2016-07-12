'use strict';
const fs = require('fs');
const path = require('path');

let jqueryPath = path.join(__dirname, '..', 'node_modules', 'jquery', 'dist', 'jquery.js');
const jqueryFile = fs.readFileSync(jqueryPath, 'utf-8');

const jsdom = require('jsdom');
const download = require('./download');

module.exports = (person) => {
    let process = {
        name: (person.fullName || person.shortName),
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
    let promise = download('http://www.stf.jus.br/portal/processo/listarProcessoParte.asp', opts);
    return promise.then(html => new Promise(resolve => jsdom.env({
        html,
        src: [jqueryFile],
        done: function (err, window) {
            let $ = window.jQuery,
                options = $('#listaPartes option');

            let promises = [];
            options.each(function(i) {
                let elem = $(this);
                if (elem.text().trim() === process.name);
                let prom = new Promise(resolve => setTimeout(() => {
                    download('http://www.stf.jus.br/portal/processo/verProcessoParte.asp', {
                        method: 'post',
                        form: {listaPartes: elem.attr('value')}
                    }).then(resolve).catch(() => resolve());
                }, 1000 * i));
                promises.push(prom);
            });

            return Promise.all(promises).then(resolve);
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

        console.log('Finish', process.name, process.list.length);
        return process;
    //    let promises = process.list.map(item => download(item.link));
    //    return Promise.all(promises);
    //}).then(htmls => {
    //    let promises = [];
    //    for (let i=0; i<htmls.length; i++ ){
    //        let html = htmls[i];
    //        let prom = new Promise(resolve => jsdom.env({
    //            html,
    //            src: [jqueryFile],
    //            done: function (err, window) {
    //                let $ = window.jQuery,
    //                    lines = $('#abaAcompanhamentoConteudoResposta tr');
    //
    //                lines.each(function() {
    //                    let elem = $('td:nth-child(1)', this);
    //                    if (!elem.length) {
    //                        return;
    //                    }
    //                    let val = elem.text().toLowerCase().trim();
    //                    if (val === 'assunto') {
    //                        let txt = $('td:nth-child(2)', this).text(),
    //                            val = txt.split('|');
    //                        if (val.length > 1) {
    //                            txt = val[val.length-1];
    //                        }
    //                        process.list[i].desc = txt.trim();
    //                    }
    //                });
    //                resolve();
    //            }
    //        }));
    //        promises.push(prom);
    //    }
    //    return Promise.all(promises).then(() => process);
    }).catch(err => {
        console.error(err, err.stack);
    });
};
