'use strict';
var findProcess = require('./src/find-process');
let persons = require('./data/national-senate-data');

let list = [];
let promise = Promise.resolve();
for (let i=0; i<persons.length; i++) {
    let person = persons[i];
    promise = promise.then(item => {
        if (item) {
            list.push(item);
        }
        return findProcess(person);
    });
}

promise.then(last => {
    list.push(last);

    new Promise((resolve, reject) => {
        const fs = require('fs');
        fs.writeFile('process-all.json', JSON.stringify(list, 0, '  '), 'utf8', (err) => {
            if (err) {
                reject(err)
            } else {
                resolve();
            }
        });
    })
});
