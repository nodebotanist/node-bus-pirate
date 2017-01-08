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

let busPirate, writeSpy

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

        afterEach(() => {
            if (busPirate.port.write.restore) {
                busPirate.port.write.restore()
            }
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

        afterEach(() => {
            if (busPirate.port.write.restore) {
                busPirate.port.write.restore()
            }
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
        let portSpy

        beforeEach((done) => {
            busPirate = new BusPirate({
                port: '/dev/tty.usbmodem-xxxx'
            });
            stubPort(busPirate)

            busPirate.on('ready', () => {
                busPirate.i2cInit()
                busPirate.port.fakeI2cReady()
            })

            portSpy = sinon.spy(busPirate.port, 'write')

            busPirate.on('I2C_ready', () => {
                busPirate.i2cConfig({
                    power: false,
                    pullups: true,
                    aux: false,
                    cs: false
                })

                busPirate.port.fakeSuccessCode()
            })

            busPirate.on('I2C_configured', done)

            busPirate.start()
            busPirate.port.fakeReady()
        })

        beforeEach(() => {
            portSpy.reset()
        })

        it('Should throw if numBytes > 4096', () => {
            busPirate.on('I2C_configured', () => {
                assert.throws(() => { busPirate.i2cReadFrom(0x00, 0x00, 5000) })
            })
        })

        it('Should emit a i2c_read_start event when the Bus Pirate ACKs the command', (done) => {
            let eventHandler = sinon.spy()

            busPirate.i2cReadFrom(0x29, 0x3A, 1)

            // the second 2 bytes of the command should be 0x00 0x02
            busPirate.once('i2c_data_start', eventHandler)

            busPirate.port.fakeSuccessCode()

            setTimeout(() => {
                assert(eventHandler.called)
                done()
            }, 15)
        })

        it('Should send the command byte first', (done) => {
            busPirate.i2cReadFrom(0x00, 0x00, 1)

            // the second 2 bytes of the command should be 0x00 0x02
            busPirate.once('i2c_data_start', () => {
                assert(portSpy.firstCall.args[0][0] == 0x08, 'first byte (command byte) should be 0x08')
                done()
            })

            busPirate.port.fakeSuccessCode()
        })

        it('Should set writeBytes (bytes 2-3) to 0x00 0x02 (for the address and register)', (done) => {
            busPirate.i2cReadFrom(0x00, 0x00, 1)

            // the second 2 bytes of the command should be 0x00 0x02
            busPirate.once('i2c_data_start', () => {
                assert(portSpy.firstCall.args[0][1] == 0x00, 'first byte of bytes to write should be 0x00')
                assert(portSpy.firstCall.args[0][2] == 0x02, 'second byte of bytes to write should be 0x02')
                done()
            })

            busPirate.port.fakeSuccessCode()
        })

        it('Should set readBytes (bytes 4-5) from numBytes', (done) => {

            busPirate.i2cReadFrom(0x00, 0x00, 258)

            busPirate.once('i2c_data_start', () => {
                console.log('inner')
                assert(portSpy.firstCall.args[0][3] == 0x01, 'first byte of bytes to read should be 0x00 when numBytes is 258')
                assert(portSpy.firstCall.args[0][4] == 0x02, 'second byte of bytes to write should be 0x01 when numBytes is 258')
                done()
            })

            busPirate.port.fakeSuccessCode()
        })

        it('Should set the address byte (6) from address', (done) => {
            busPirate.i2cReadFrom(0x29, 0x3A, 1)

            // the second 2 bytes of the command should be 0x00 0x02
            busPirate.once('i2c_data_start', () => {
                assert(portSpy.firstCall.args[0][5] == 0x29, 'expected 0x29 for address, got ' + portSpy.firstCall.args[0][1])
                done()
            })

            busPirate.port.fakeSuccessCode()
        })

        it('Should send the register byte (7) from register', (done) => {
            busPirate.i2cReadFrom(0x29, 0x3A, 1)

            // the second 2 bytes of the command should be 0x00 0x02
            busPirate.once('i2c_data_start', () => {
                assert(portSpy.firstCall.args[0][6] == 0x3A, 'expected 0x3A for register, got ' + portSpy.firstCall.args[0][2])
                done()
            })

            busPirate.port.fakeSuccessCode()
        })

        it('Should fire the i2c_read_error event if the Bus Pirate throws an error', (done) => {
            let eventHandler = sinon.spy()

            busPirate.i2cReadFrom(0x29, 0x3A, 1)
            busPirate.once('i2c_read_error', eventHandler)
            busPirate.port.fakeFailureCode()

            setTimeout(() => {
                assert(eventHandler.called)
                done()
            }, 15)
        })

        it('Should emit a i2c_data event on data from the BusPirate', (done) => {
            let eventHandler = sinon.spy()

            busPirate.i2cReadFrom(0x29, 0x3A, 3)
            busPirate.on('i2c_read_data', (data) => {
                eventHandler(data)
            })
            busPirate.port.fakeSuccessCode()
            busPirate.port.fakeByteStream()

            setTimeout(() => {
                assert(eventHandler.calledThrice, 'expected 3 calls, got ' + eventHandler.callCount)
                assert(eventHandler.firstCall.args[0] == '0x01', 'expected 0x01, got ' + eventHandler.firstCall.args[0])
                assert(eventHandler.secondCall.args[0] == '0x02', 'expected 0x02, got ' + eventHandler.secondCall.args[0])
                assert(eventHandler.thirdCall.args[0] == '0x03', 'expected 0x03, got ' + eventHandler.thirdCall.args[0])
                done()
            }, 30)
        })

        it('Should emit a i2c_read_end event when all expected bytes have been recieved', (done) => {
            let eventHandler = sinon.spy()

            busPirate.i2cReadFrom(0x29, 0x3A, 3)
            busPirate.on('i2c_read_end', eventHandler)

            busPirate.port.fakeSuccessCode()
            busPirate.port.fakeByteStream()

            setTimeout(() => {
                assert(eventHandler.called)
                done()
            }, 30)
        })
    })

})