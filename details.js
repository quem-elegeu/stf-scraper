'use strict';

//const list = require('./result/investigations');
const list = require('./result/only-prosecutions');
const processDetails = require('./src/process-details');


let promise = Promise.resolve();
for(let i=0; i<list.length; i++) {
    let person = list[i];

    for(let j=0; j<person.list.length; j++) {
        let item = person.list[j];

        promise = promise.then(() => {
            return processDetails(item.link, person.name).then(res => {
                item.valid = res.has;
                item.names = res.names;
                item.title = res.title;
                item.subject = res.subject;
                console.log('Finish', person.name, item.valid, item.link);
            }).catch(() => {
                console.log('Error', person.name, item.link);
            });
        });
    }
}

promise.then(() => {
    const fs = require('fs');
    //let fileName = 'investigations-validate.json';
    let fileName = 'prosecutions-validate.json';
    fs.writeFile(fileName, JSON.stringify(list, 0, '  '), 'utf8', (err) => {
        err && console.error(err, err.stack)
    });
});