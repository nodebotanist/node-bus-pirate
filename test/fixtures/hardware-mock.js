const EventEmitter = require('events').EventEmitter
const util = require('util')

// mock port
// stubs all the necessary functions of the serial port
function MockPort() {
    if (!this instanceof MockPort) {
        throw new Error('MockPort is a constructor')
    }

    EventEmitter.call(this)
}

util.inherits(MockPort, EventEmitter)

MockPort.prototype.open = function(cb) {
    this.emit('open')
    cb()
}

MockPort.prototype.write = function(dataArray, cb) {
    if (cb) { cb(null) }
}

MockPort.prototype.fakeReady = function() {
    setTimeout(() => { this.emit('data', Buffer.from('BBIO1')) }, 5)
}

MockPort.prototype.fakeI2cReady = function() {
    setTimeout(() => { this.emit('data', Buffer.from('I2C1')) }, 5)
}

MockPort.prototype.fakeSuccessCode = function() {
    setTimeout(() => { this.emit('data', Buffer.from('\\u0001')) }, 5)
}

MockPort.prototype.fakeFailureCode = function() {
    setTimeout(() => { this.emit('data', Buffer.from('\\u0000')) }, 5)
}

MockPort.prototype.fakeByteStream = function() {
    setTimeout(() => { this.emit('data', Buffer.from([0x01])) }, 10)
    setTimeout(() => { this.emit('data', Buffer.from([0x02])) }, 15)
    setTimeout(() => { this.emit('data', Buffer.from([0x03])) }, 20)
}

module.exports = MockPort