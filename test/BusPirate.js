// Need to test
// constructor -- validation and success
// start -- success and failure

const assert = require('chai').assert
const sinon = require('sinon')
const fs = require('fs')

const BusPirate = require('../BusPirate.js')

describe('Main BusPirate module', () => {
    let busPirate, fsStub

    before(() => {
        fsStub = sinon.stub(fs, 'stat')
        fsStub.withArgs('/dev/tty.usbserial-xxxx').yields([null, {}])
        fsStub.withArgs('/dev/tty.usbserial-yyyy').yields([new Error(), null])
    })

    beforeEach(() => {
        busPirate = undefined;
    })

    describe('constructor', () => {
        it('should construct when a port that exists is passed', () => {
            busPirate = new BusPirate({
                port: '/dev/tty.usbserial-xxxx'
            })

            assert(busPirate instanceof BusPirate)
        })

        it('should fail when a non-existant port is passed', () => {
            let fn = () => {
                busPirate = new BusPirate({
                    port: '/dev/tty.usbserial-yyyy'
                })
            }

            assert.throws(fn, 'BusPirate constructor did not throw an error')
        })

        it('should fail when no port is passed', () => {
            let fn = () => {
                busPirate = new BusPirate({})
            }

            assert.throws(fn, 'BusPirate constructor did not throw an error')
        })
    })

    describe('start()', () => {

    })

    describe('data queue', () => {

    })
})