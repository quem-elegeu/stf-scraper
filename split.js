'use strict';
var fs = require('fs');

let process = [];
const sortName = (a, b) => {
    if (a.fullName > b.fullName) {
        return 1;
    } else {
        return -1;
    }
};

//process.push(...require('./process-senate-all').sort(sortName));
//process.push(...require('./process-congress-all').sort(sortName));
process.push(...require('./investigations-validate').sort(sortName));
process.push(...require('./prosecutions-validate').sort(sortName));

let senates = require('./data/national-senate-data');

let cache = {};
for (let i=0; i<senates.length; i++) {
    let senate = senates[i];
    cache[senate.fullName] = senate;
}

let investigations = [],
    prosecutions = [];
for (let i=0; i<process.length; i++) {
    let person = process[i];
    let dataP = {
        name: person.name,
        email: person.email || cache[person.name].email,
        party: person.party,
        state: person.state,
        list: []
    };
    let dataI = JSON.parse(JSON.stringify(dataP));

    for(let j=0; j<person.list.length; j++) {
        let item = person.list[j];
        if (item.subject) {
            item.desc = item.subject.split('<br>').map(p => {
                return p.split('|')[2];
            }).filter(p => p && p.trim().length).map(p => p.trim()).join(', ');
        }
        if (!item.desc || !item.desc.trim().length) {
            item.desc = '- Sem Descrição - ';
        }
        delete item.valid;
        delete item.names;
        delete item.title;
        delete item.subject;
        if (item.type === 'Ação Penal') {
            dataP.list.push(item);
        } else {
            dataI.list.push(item);
        }
    }
    dataP.list.length && prosecutions.push(dataP);
    dataI.list.length && investigations.push(dataI);
}

Promise.all([
    new Promise((resolve, reject) => {
        const fs = require('fs');
        fs.writeFile('prosecutions.json', JSON.stringify(prosecutions, 0, '  '), 'utf8', (err) => {
            if (err) {
                reject(err)
            } else {
                resolve();
            }
        });
    }),
    new Promise((resolve, reject) => {
        const fs = require('fs');
        fs.writeFile('investigations.json', JSON.stringify(investigations, 0, '  '), 'utf8', (err) => {
            if (err) {
                reject(err)
            } else {
                resolve();
            }
        });
    })
]).then(() => {
    console.log('finish split');
})