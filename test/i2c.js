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

    after(() => {
        fs.stat.restore()
    })

    describe('.i2cInit()', () => {

        beforeEach(() => {
            busPirate = new BusPirate({
                port: '/dev/tty.usbmodem-xxxx'
            });
            stubPort(busPirate)
        })

        it('should fire an I2C_ready event when "I2C1" is received', (done) => {
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

        it('should set ._i2c to true', (done) => {
            busPirate.on('ready', () => {
                busPirate.on('I2C_ready', () => {
                    assert(busPirate._i2c, 'Expected ._i2c to be true')
                    done()
                })

                busPirate.i2cInit()
                busPirate.port.fakeI2cReady()
            })

            busPirate.start()
            busPirate.port.fakeReady()
        })

        it('should call a callback if one is passed', (done) => {
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

    describe('.i2cConfig()', () => {
        it('should throw if I2C mode is not active', (done) => {
            busPirate.on('ready', () => {
                assert.throws(() => { busPirate.i2cConfig({}) }, /\.i2cConfig\(\) requires I2C mode to be active/)
                done()
            })

            busPirate.start()
            busPirate.port.fakeReady()
        })

        beforeEach(() => {
            busPirate = new BusPirate({
                port: '/dev/tty.usbmodem-xxxx'
            });
            stubPort(busPirate)

            busPirate.on('ready', () => {
                busPirate.i2cInit()
                busPirate.port.fakeI2cReady()
            })

            busPirate.start()
            busPirate.port.fakeReady()
        })

        it('should throw if no options are sent', (done) => {
            busPirate.on('I2C_ready', () => {
                assert.throws(busPirate.i2cConfig, /options object must be passed to .i2cConfig\(\)/)
                done()
            })

            busPirate.i2cInit()
            busPirate.port.fakeI2cReady()
        })

        it('should emit an I2C_configured event when complete', (done) => {
            let eventHandler = sinon.spy()

            busPirate.on('I2C_ready', () => {
                busPirate.i2cConfig({
                    power: true,
                    pullups: true,
                    aux: true,
                    cs: true
                })
                busPirate.port.fakeSuccessCode()

                setTimeout(() => {
                    assert(eventHandler.called, 'I2C_configured event was not emitted')
                    done()
                }, 20)
            })

            busPirate.on('I2C_configured', eventHandler)

            busPirate.i2cInit()
            busPirate.port.fakeI2cReady()
        })

        it('should call a callback if passed when complete', (done) => {
            let eventHandler = sinon.spy()

            busPirate.on('I2C_ready', () => {
                busPirate.i2cConfig({
                    power: true,
                    pullups: true,
                    aux: true,
                    cs: true
                }, eventHandler)
                busPirate.port.fakeSuccessCode()

                setTimeout(() => {
                    assert(eventHandler.called, '.i2cConfig() callback not called')
                    done()
                }, 10)
            })

            busPirate.i2cInit()
            busPirate.port.fakeI2cReady()
        })

        it('should write 0x40 if all options are false', (done) => {
            let writeSpy

            busPirate.on('I2C_ready', () => {
                writeSpy = sinon.spy(busPirate.port, 'write')

                busPirate.i2cConfig({
                    power: false,
                    pullups: false,
                    aux: false,
                    cs: false
                })

                busPirate.port.fakeSuccessCode()
            })

            busPirate.on('I2C_configured', () => {
                assert(writeSpy.firstCall.args[0][0] == 0x40, 'Expected ' + writeSpy.firstCall.args[0][0] + ' to equal 0x40')
                done()
            })

            busPirate.i2cInit()
            busPirate.port.fakeI2cReady()
        })

        it('should write power bit correctly', (done) => {
            let writeSpy

            busPirate.on('I2C_ready', () => {
                writeSpy = sinon.spy(busPirate.port, 'write')
                busPirate.i2cConfig({
                    power: true,
                    pullups: false,
                    aux: false,
                    cs: false
                })

                busPirate.port.fakeSuccessCode()
            })

            busPirate.on('I2C_configured', () => {
                assert(writeSpy.firstCall.args[0][0] == 0x48, 'Expected ' + writeSpy.firstCall.args[0][0] + ' to equal 0x48')
                done()
            })

            busPirate.i2cInit()
            busPirate.port.fakeI2cReady()
        })

        it('should write pullup resistor bit correctly', (done) => {
            let writeSpy

            busPirate.on('I2C_ready', () => {
                writeSpy = sinon.spy(busPirate.port, 'write')
                busPirate.i2cConfig({
                    power: false,
                    pullups: true,
                    aux: false,
                    cs: false
                })

                busPirate.port.fakeSuccessCode()
            })

            busPirate.on('I2C_configured', () => {
                assert(writeSpy.firstCall.args[0][0] == 0x44, 'Expected ' + writeSpy.firstCall.args[0][0] + ' to equal 0x44')
                done()
            })

            busPirate.i2cInit()
            busPirate.port.fakeI2cReady()
        })

        it('should write AUX bit correctly', (done) => {
            let writeSpy

            busPirate.on('I2C_ready', () => {
                writeSpy = sinon.spy(busPirate.port, 'write')
                busPirate.i2cConfig({
                    power: false,
                    pullups: false,
                    aux: true,
                    cs: false
                })
                busPirate.port.fakeSuccessCode()
            })

            busPirate.on('I2C_configured', () => {
                assert(writeSpy.firstCall.args[0][0] == 0x42, 'Expected ' + writeSpy.firstCall.args[0][0] + ' to equal 0x42')
                done()
            })

            busPirate.i2cInit()
            busPirate.port.fakeI2cReady()
        })

        it('should write CS bit correctly', (done) => {
            let writeSpy

            busPirate.on('I2C_ready', () => {
                writeSpy = sinon.spy(busPirate.port, 'write')
                busPirate.i2cConfig({
                    power: false,
                    pullups: false,
                    aux: false,
                    cs: true
                })

                busPirate.port.fakeSuccessCode()
            })

            busPirate.on('I2C_configured', () => {
                assert(writeSpy.firstCall.args[0][0] == 0x41, 'Expected ' + writeSpy.firstCall.args[0][0] + ' to equal 0x41')
                done()
            })

            busPirate.i2cInit()
            busPirate.port.fakeI2cReady()
        })
    })

    describe('.i2cReadFrom()', () => {
        before((done) => {
            busPirate = new BusPirate({
                port: '/dev/tty.usbmodem-xxxx'
            });
            stubPort(busPirate)

            busPirate.on('ready', () => {
                busPirate.i2cInit()
                busPirate.port.fakeI2cReady()
            })

            busPirate.on('I2C_ready', () => {
                writeSpy = sinon.spy(busPirate.port, 'write')
                busPirate.i2cConfig({
                    power: false,
                    pullups: true,
                    aux: false,
                    cs: false
                })

                busPirate.port.fakeSuccessCode()
            })

            busPirate.on('I2C_configured', () => {
                done()
            })

            busPirate.start()
            busPirate.port.fakeReady()
        })

        it('Should throw if numBytes > 4096', () => {
            assert.throws(() => {})
        })

        it('Should set writeBytes to 2 (for the address and register)', () => {

        })

        it('Should set the correct number of bytes to read in the command byte', () => {

        })

        it('Should send the command byte first', () => {

        })

        it('Should send the address byte second', () => {

        })

        it('Should send the register byte third', () => {

        })

        it('Should throw if the Bus Pirate throws an error', () => {

        })

        it('Should emit a i2c_read_begin event when the Bus Pirate ACKs the read', () => {

        })

        it('Should emit a i2c_data event on data from the BusPirate', () => {

        })

        it('Should emit a i2c_read_end event when all expected bytes have been recieved', () => {

        })

        it('Should emit an i2c_timeout event if not all bytes are received', () => {

        })
    })

})