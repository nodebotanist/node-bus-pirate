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
        fsStub.withArgs('/dev/tty.usbserial-xxxx').yields()
        fsStub.withArgs('/dev/tty.usbserial-yyyy').throws(new Error('Port not found'))
    })

    beforeEach(() => {
        busPirate = undefined;
    })

    after(() => {
        fs.stat.restore()
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

            assert.throws(fn, /Port not found/, 'BusPirate constructor did not throw an error')
        })

        it('should fail when no port is passed', () => {
            let fn = () => {
                busPirate = new BusPirate({})
            }

            assert.throws(fn, /^Port required/, 'BusPirate constructor did not throw an error')
        })
    })

    describe('start()', (done) => {
        it('should fire the ready event when the bus pirate sends BBIO1', () => {
            busPirate = new BusPirate({
                port: '/dev/tty.usbserial-xxxx'
            })

            let eventHandler = sinon.spy()

            busPirate.on('ready', eventHandler)
            busPirate.start()
            busPirate.port.emit('data', 'BBIO1')

            setTimeout(() => {
                assert(eventHandler.called)
                done()
            }, 10)
        })
    })

    describe('reset()', () => {

    })

    describe('data queue', () => {

    })
})