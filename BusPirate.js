const util = require('util')
const fs = require('fs')
const EventEmitter = require('events').EventEmitter
const SerialPort = require('serialport')
const async = require('async')

// our InputQueue object
const InputQueue = require('./lib/InputQueue.js')

// add the I2C module
const i2c = require('./lib/i2c.js')

// add the UART module
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
    this.inputQueue = new InputQueue()

    // Initial state setup
    this._ready = false
    this._i2c = false

    this.port = new SerialPort(
        options.port, {
            baudRate: 115200, // to do: make this an option
            autoOpen: false
        }
    )

    this.port.on('open', () => { this.emit('open') }) // todo: is this needed?

    this.port.on('data', (data) => {
        this.inputQueue.add(data)
    })
}

util.inherits(BusPirate, EventEmitter)

// Add in the I2C module
Object.assign(BusPirate.prototype, i2c)

// Add in the UART module
Object.assign(BusPirate.prototype, uart)

/**
 * Sends a reset code to the bus pirate-- exits the current mode if applicable then performs a hardware reset
 * @method reset
 */
BusPirate.prototype.reset = function() {
    let exitReady = false
    this.port.write([0x00])
    async.until(
        () => exitReady,
        (cb) => {
            if (this.inputQueue.length === 0) {
                this.port.write([0x00], () => { setTimeout(cb, 10) })
            } else {
                let message = this.inputQueue.fetchString(5)
                if (message && message == 'BBIO1') {
                    this.port.write([0x0F])
                    exitReady = true
                    this.inputQueue.flush()
                    cb(null)
                } else {
                    setTimeout(cb, 10)
                }
            }
        }
    )
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
                    let message = this.inputQueue.fetchString(5)
                    if (message && message == 'BBIO1') {
                        this._ready = true

                        /**
                         * Ready event -- signals the bus pirate is ready to recieve commands
                         *
                         * @event ready
                         */
                        this.emit('ready')
                        this.inputQueue.flush()
                        cb(null)
                    } else {
                        setTimeout(cb, 10)
                    }
                }
            }
        )
    })
}

module.exports = BusPirate