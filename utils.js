'use strict';

module.exports.breakDownBy = (array, size) => {
    let stackIndex = -1;
    let stacks = [];
    array.forEach((el, index) => {
        if (index % size == 0) {
            stackIndex++;
            stacks.push([]);
        }
        stacks[stackIndex].push(el)
    })
    return stacks;
}