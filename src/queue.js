'use strict';

module.exports = ({throttle = 6} = {}) => {
    const queue = [];
    let counter = 0;

    const processQueue = () => {
        if (queue.length > 0 && counter < throttle) {
            counter++;
            let item = queue.shift();
            setTimeout(function () {  // simulate long running async process
                item.data().then(result => {
                    counter--;
                    item.resolve(result);

                    if (queue.length > 0 && counter < throttle) {
                        processQueue(); // on to next item in queue
                    }
                });
            }, 500);
        }
    };
    return (data) => new Promise(resolve => {
        queue.push({data, resolve});

        return processQueue();
    });
};
