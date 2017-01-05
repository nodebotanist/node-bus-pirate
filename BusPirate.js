const util = require('util')
const fs = require('fs')
const EventEmitter = require('events').EventEmitter
const SerialPort = require('serialport')
const async = require('async')

const i2c = require('./lib/i2c.js')
const uart = require('./lib/uart.js')

/**
 * Main BusPirate module
 * @module BusPirate
 * @author nodebotanist
 */

/**
 * Represents a BusPirate object
 * @constructor
 * @function
 * @param {Object} options
 * @param {String} options.port -- the absolute path to the serial port of the bus pirate (e.g. /dev/tty.usbserial-xxxx)
 */
function BusPirate(options) {
    // throw if no port is given
    if (!options || !options.port) {
        throw new Error('Port required in options object')
    }

    // throw if port does not exist
    fs.stat(options.port, (err) => {
        if (err) {
            throw new Error('Port not found')
        }
    })

    EventEmitter.call(this)

    // Queue input from the bus pirate for stuff that needs to be synchronus
    this.inputQueue = []

    // Initial state setup
    this._ready = false

    this.port = new SerialPort(
        options.port, {
            baudRate: 115200,
            autoOpen: false
        }
    )

    this.port.on('open', () => { this.emit('open') })

    this.port.on('data', (data) => {
        data = Buffer.from(data).toString()
        this.inputQueue.push(data)
    })
}

util.inherits(BusPirate, EventEmitter)

// Add in the I2C module
Object.assign(BusPirate.prototype, i2c)

// Add in the UART module
Object.assign(BusPirate.prototype, uart)

/**
 * Sends a reset code to the bus pirate
 * @method reset
 */
BusPirate.prototype.reset = function(cb) {
    let exitReady = false
    this.port.write([0x00])
    async.until(
        () => exitReady,
        (cb) => {
            if (this.inputQueue.length === 0) {
                this.port.write([0x00], () => { setTimeout(cb, 10) })
            } else {
                let message = this.inputQueue.shift()
                if (message.indexOf('BBIO1') !== -1) {
                    this.port.write([0x0F])
                    exitReady = true
                    this._flush()
                }
                cb(null)
            }
        }
    )
}

BusPirate.prototype._flush = function() {
    this.inputQueue = []
}

/**
 * Starts the bus pirate.
 * @method start
 * @fires ready
 */
BusPirate.prototype.start = function() {
    this.port.open(() => {
        async.until(
            () => this._ready,
            (cb) => {
                if (this.inputQueue.length === 0) {
                    this.port.write([0x00], () => { setTimeout(cb, 10) })
                } else {
                    let message = this.inputQueue.shift()
                    if (message.indexOf('BBIO1') !== -1) {
                        this._ready = true

                        /**
                         * Ready event -- signals the bus pirate is ready to recieve commands
                         *
                         * @event ready
                         */
                        this.emit('ready')
                        this._flush()
                    }
                    cb(null)
                }
            }
        )
    })
}

module.exports = BusPirate