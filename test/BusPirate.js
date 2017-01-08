// Need to test
// constructor -- validation and success
// start -- success and failure

const assert = require('chai').assert
const sinon = require('sinon')
const fs = require('fs')

const BusPirate = require('../BusPirate.js')

const MockPort = require('./fixtures/hardware-mock.js')

function stubPort(busPirate) {
    busPirate.port = new MockPort()

    busPirate.port.on('open', () => {
        busPirate.emit('open')
    })

    busPirate.port.on('data', (data) => {
        busPirate.inputQueue.add(data)
    })
}

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

    describe('start()', () => {
        it('should fire the ready event when the bus pirate sends BBIO1', (done) => {
            busPirate = new BusPirate({
                port: '/dev/tty.usbserial-xxxx'
            })
            stubPort(busPirate)

            let eventHandler = sinon.spy()

            busPirate.start()
            busPirate.on('ready', () => {
                eventHandler()
            })

            busPirate.port.fakeReady()

            setTimeout(() => {
                assert(eventHandler.called, 'Ready event handler was not called')
                done()
            }, 20)
        })
    })

    describe('reset()', () => {
        it('should fire a 0x00, wait for BBIO1, then fire 0x0F', (done) => {
            busPirate = new BusPirate({
                port: '/dev/tty.usbserial-xxxx'
            })
            stubPort(busPirate)

            busPirate.start()

            busPirate.port.fakeReady()

            busPirate.on('ready', () => {
                let writeSpy = sinon.spy(busPirate.port, 'write')

                busPirate.reset(() => {})

                busPirate.port.fakeReady()

                setTimeout(() => {
                    assert(writeSpy.called, 'reset() did not call port.write')
                    assert(writeSpy.getCall(0).args[0][0] == 0x00, 'reset() did not call port.write with 0x00 first')
                    assert(writeSpy.lastCall.args[0][0] == 0x0F, 'reset() did not call port.write with 0x0F second')
                    done()
                }, 15)
            })
        })
    })
})