'use strict';
const diacritics = require('diacritics');
const findProcess = require('./src/find-process');
const queue = require('./src/queue')();
const changeCase = require('change-case');

let persons = [];
const sortName = (a, b) => {
    if (a.fullName > b.fullName) {
        return 1;
    } else {
        return -1;
    }
};
persons.push(...require('./data/national-executive-data').sort(sortName));
persons.push(...require('./data/national-congress-data').sort(sortName));
persons.push(...require('./data/national-senate-data').sort(sortName));

let list = [];

const saveFile = () => new Promise((resolve, reject) => {
    const fs = require('fs');
    fs.writeFile('process-all.json', JSON.stringify(list, 0, '  '), 'utf8', (err) => {
        if (err) {
            reject(err)
        } else {
            resolve();
        }
    });
});
let promises = [];
for (let i=0; i<persons.length; i++) {
    let person = persons[i];
    let promFunc = () => Promise.resolve().then(() => {
        let promises = [
            findProcess(person)
        ];

        let name = changeCase.titleCase(person.shortName);
        if (person.fullName !== name) {
            let _person = JSON.parse(JSON.stringify(person));
            _person.name =  name;
            promises.push(findProcess(_person));
        }

        return Promise.all(promises);
    }).then(([full, short]) => {
        let data = JSON.parse(JSON.stringify(full));
        if (short && short.list && short.list.length) {
            data.nick = short.name;
            for (let i = 0, total = short.list.length; i < total; i++) {
                let item = short.list[i];
                if (!data.list.some(p => p.code === item.code)) {
                    data.list.push(item);
                }
            }
        } else {
            data.nick = full.name;
        }
        if (data.list && data.list.length) {
            data.list.sort((a, b) => (a.code > b.code) ? -1 : 1);
        }
        console.log('=>>>', data.name, `(${data.nick})`, data.list.length);

        data.path = diacritics.remove(data.nick).toLowerCase().replace(/[\s]+/g, '-');
        list.push(data);
        return saveFile();
    });
    promises.push(queue(promFunc));
}

Promise.all(promises).then(() => {
    console.log('#### Finish All')
}).catch(err => {
    console.error(err, err.stack);
});
