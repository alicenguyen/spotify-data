'use strict';

const expect = require('chai').expect;
const utils = require('../utils');

describe('test.utils', function () {

    it('break down arrays ', (done)=> {
        let array = [1,2,3,4,5,6];
        let chunks = utils.breakDownBy(array, 5)
        console.log(chunks)
        expect(chunks).to.have.lengthOf(2);
        done();
    });

});


