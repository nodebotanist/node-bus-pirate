const util = require('util')
const EventEmitter = require('events').EventEmitter
const SerialPort = require('serialport')
const async = require('async')

const i2c = require('./lib/i2c.js')

function BusPirate(options) {
    EventEmitter.call(this)
    this.port = new SerialPort(
        options.port, {
            baudRate: 115200,
        }
    )
    this.inputQueue = []
    this._ready = false

    this.port.on('open', function() { this.emit('open') }.bind(this))

    this.port.on('data', function(data) {
        data = Buffer.from(data).toString()
        this.inputQueue.push(data)
        console.log('Queue: ', this.inputQueue)
    }.bind(this))
}

util.inherits(BusPirate, EventEmitter)

Object.assign(BusPirate.prototype, i2c)

BusPirate.prototype.reset = function() {
    this.port.write([0x0F])
}

BusPirate.prototype._flush = function() {
    this.inputQueue = []
}

BusPirate.prototype.start = function() {
    async.until(
        () => this._ready,
        (cb) => {
            if (this.inputQueue.length === 0) {
                this.port.write([0x00], () => { setTimeout(cb, 100) })
            } else {
                let message = this.inputQueue.shift()
                if (message.indexOf('BBIO1') !== -1) {
                    console.log('ready')
                    this._ready = true
                    this.emit('ready')
                    this._flush()
                }
                cb(null)
            }
        }
    )
}

module.exports = BusPirate