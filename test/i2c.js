const assert = require('chai').assert
const sinon = require('sinon')
const fs = require('fs') // so we can stub fs.stat

const BusPirate = require('../BusPirate.js')
const MockPort = require('./fixtures/hardware-mock.js')

function stubPort(busPirate) {
    busPirate.port = new MockPort()

    busPirate.port.on('open', () => {
        busPirate.emit('open')
    })

    busPirate.port.on('data', (data) => {
        busPirate.inputQueue.push(data)
    })
}

let busPirate

describe('I2C module', () => {
    before(() => {
        fsStub = sinon.stub(fs, 'stat')
        fsStub.withArgs('/dev/tty.usbserial-xxxx').yields()
    })

    beforeEach(() => {
        busPirate = undefined;
    })

    after(() => {
        fs.stat.restore()
    })

    describe('.i2cInit()', () => {
        it('should fire an I2C_ready event when "I2C1" is received', (done) => {
            busPirate = new BusPirate({
                port: '/dev/tty.usbmodem-xxxx'
            })
            stubPort(busPirate)

            let eventHandler = sinon.spy()

            busPirate.on('ready', () => {
                busPirate.on('I2C_ready', eventHandler)

                busPirate.i2cInit()
                busPirate.port.fakeI2cReady()

                setTimeout(() => {
                    assert(eventHandler.called, '.i2cInit "ready" event handler not called')
                    done()
                }, 15)
            })

            busPirate.start()
            busPirate.port.fakeReady()
        })

        it('should call a callback if one is passed', (done) => {
            busPirate = new BusPirate({
                port: '/dev/tty.usbmodem-xxxx'
            })
            stubPort(busPirate)

            let eventHandler = sinon.spy()

            busPirate.on('ready', () => {
                busPirate.i2cInit(eventHandler)
                busPirate.port.fakeI2cReady()

                setTimeout(() => {
                    assert(eventHandler.called, '.i2cInit callback not called')
                    done()
                }, 15)
            })

            busPirate.start()
            busPirate.port.fakeReady()
        })

        it('should recover from an accidental reset', (done) => {
            busPirate = new BusPirate({
                port: '/dev/tty.usbmodem-xxxx'
            })
            stubPort(busPirate)

            let eventHandler = sinon.spy()

            busPirate.on('ready', () => {
                busPirate.on('I2C_ready', eventHandler)

                busPirate.i2cInit()
                busPirate.port.fakeReady()
                setTimeout(() => { busPirate.port.fakeI2cReady() }, 10)

                setTimeout(() => {
                    assert(eventHandler.called, 'I2C ready event handler not called')
                    done()
                }, 25)
            })

            busPirate.start()
            busPirate.port.fakeReady()
        })
    })

    describe('init()', () => {
        it('should throw if no options are sent', () => {

        })

        it('should emit an I2C_configured event when complete', () => {

        })

        it('should call a callback if passed when complete', () => {

        })

        it('should write 0x40 if all options are false', () => {

        })

        it('should write power bit correctly', () => {

        })

        it('should write pullup resistor bit correctly', () => {

        })

        it('should write AUX bit correctly', () => {

        })

        it('should write CS bit correctly', () => {

        })
    })

})