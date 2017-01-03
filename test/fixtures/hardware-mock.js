const EventEmitter = require('events').EventEmitter
const util = require('util')

// mock port
// stubs all the functions of the serial port
function MockPort() {
    if (!this instanceof MockPort) {
        throw new Error('MockPort is a constructor')
    }

    EventEmitter.call(this)
}

util.inherits(MockPort, EventEmitter)

MockPort.prototype.open = function() {
    this.emit('open')
}

MockPort.prototype.write = function(dataArray, cb) {
    cb(null)
}

module.exports = MockPort