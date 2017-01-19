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
        busPirate.inputQueue.add(data)
    })
}

let busPirate, writeSpy, cbSpy

describe('UART module', () => {
    before(() => {
        fsStub = sinon.stub(fs, 'stat')
        fsStub.withArgs('/dev/tty.usbserial-xxxx').yields()
    })

    after(() => {
        fs.stat.restore()
    })

    describe('.uartInit()', () => {
        beforeEach(() => {
            busPirate = new BusPirate({
                port: '/dev/tty.usbserial-xxxx'
            })
            stubPort(busPirate)
            busPirate.start()
            busPirate.port.fakeReady()
        })

        afterEach(() => {
            if (busPirate.port.write.restore) {
                busPirate.port.write.restore()
            }
        })

        it('should write out an 0x03 to set UART mode', (done) => {
            busPirate.on('ready', () => {
                writeSpy = sinon.spy(busPirate.port, 'write')
                busPirate.uartInit()
                busPirate.port.fakeReady()
                busPirate.port.fakeUartReady()

                setTimeout(() => {
                    assert(writeSpy.lastCall.args[0] == 0x03, '0x03 was not written, got ' + writeSpy.secondCall.args[0])
                    done()
                }, 15)
            })
        })

        it('should fire a uart_ready event when ready', (done) => {
            cbSpy = new sinon.spy()

            busPirate.on('ready', () => {
                busPirate.on('uart_ready', cbSpy)
                busPirate.uartInit()
                busPirate.port.fakeReady()
                busPirate.port.fakeUartReady()

                setTimeout(() => {
                    assert(cbSpy.called, 'The uart_ready event handler was not called')
                    done()
                }, 15)
            })
        })

        it('should recover from an accidental reset', (done) => {
            cbSpy = new sinon.spy()


            busPirate.on('ready', () => {
                busPirate.on('mode_reset', () => {
                    busPirate.on('uart_ready', cbSpy)

                    busPirate.port.fakeReady()
                    setTimeout(() => { busPirate.port.fakeUartReady() }, 5)

                    setTimeout(() => {
                        assert(cbSpy.called, 'UART ready event handler not called')
                        done()
                    }, 25)
                })
                busPirate.uartInit()
                busPirate.port.fakeReady()
            })
        })
    })

    describe('.uartSetBaudRate()', () => {
        beforeEach((start) => {
            busPirate = new BusPirate({
                port: '/dev/tty.usbserial-xxxx'
            })
            stubPort(busPirate)
            busPirate.on('ready', () => {
                busPirate.on('uart_ready', start)
                busPirate.uartInit()
                busPirate.port.fakeReady()
                busPirate.port.fakeUartReady()
            })
            busPirate.start()
            busPirate.port.fakeReady()
        })

        afterEach(() => {
            if (busPirate.port.write.restore) {
                busPirate.port.write.restore()
            }
        })

        it('should throw an error for an invalid speed', () => {
            assert.throws(() => { busPirate.uartSetBaudRate(1234) }, /invalid baudRate sent to \.uartSetBaudRate\(\)/)
        })

        it('should throw an error if no speed is sent', () => {
            assert.throws(() => { busPirate.uartSetBaudRate() }, /\.uartSetBaudRate\(\) requires a baudRate parameter/)
        })

        it('should send command byte corresponding to the chosen speed', (done) => {
            writeSpy = sinon.spy(busPirate.port, 'write')
            busPirate.uartSetBaudRate(300)
            busPirate.uartSetBaudRate(4800)

            setTimeout(() => {
                assert(writeSpy.firstCall.args[0] == 0x60, '0x60 was not written, got ' + writeSpy.firstCall.args[0])
                assert(writeSpy.secondCall.args[0] == 0x63, '0x63 was not written, got ' + writeSpy.secondCall.args[0])
                done()
            }, 15)
        })

        it('should fire a uart_baud_rate_set event when sucessful', (done) => {
            cbSpy = new sinon.spy()

            busPirate.on('uart_baud_rate_set', cbSpy)
            busPirate.uartSetBaudRate(4800)
            busPirate.port.fakeSuccessCode()

            setTimeout(() => {
                assert(cbSpy.called, 'The uart_baud_rate_set event handler was not called')
                done()
            }, 15)
        })
    })
})