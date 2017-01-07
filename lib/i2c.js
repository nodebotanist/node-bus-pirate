const async = require('async')

/**
 * I2C module - adds I2C function calls to the BusPirate object
 * @module BusPirate/i2c
 * @author nodebotanist
 */

i2c = {};

/**
 * Initializes the I2C mode
 * @method i2cInit
 * @param {I2cInitCallback} initCallback - optional callback on completion
 * @fires I2C_ready
 */
i2c.i2cInit = function(callback) {
    this.port.write([0x02])
    async.until(
        () => this._i2c,
        (cb) => {
            if (this.inputQueue.length < 1) {
                setTimeout(cb, 10)
            } else {
                // check for accidental reset
                if (this.inputQueue[0].indexOf('BBIO1') !== -1) {
                    this._flush()
                    this.port.write([0x02], () => { setTimeout(cb, 10) })
                    this._i2c = false
                } else if (this.inputQueue.join('').indexOf('I2C1') !== -1) {
                    this._flush()
                    this._i2c = true

                    /**
                     * I2C_ready event - signals that the BusPirate is ready for I2C commands
                     *
                     * @event I2C_ready
                     */
                    this.emit('I2C_ready')
                    cb()
                }
            }
        },
        /**
         * This is called when I2C is ready
         *
         * @callback I2cInitCallback
         * @param {Error} error - null if sucessful
         */
        callback
    )
}

/**
 * Configures the BusPirate to recieve I2C commands
 * @method i2cConfig
 * @param {Object} options - options for the BusPirate
 * @param {boolean} options.power - turns on the power to the 3.3 and 5V pins when true, off when false
 * @param {boolean} options.pullups - enables pullup resistors when true, disables when false
 * @param {boolean} options.aux - sets the state of the AUX pin (HIGH on true, LOW on false)
 * @param {boolean} options.cs - sets the state of the CS pin (HIGH on true, LOW on false)
 * @param {I2cConfigCallback} callback - called when complete
 */
i2c.i2cConfig = function(opts, callback) {
    if (!opts) {
        throw new Error('options object must be passed to .i2cConfig()')
    }
    if (!this._i2c) {
        throw new Error('.i2cConfig() requires I2C mode to be active')
    }

    let tempByte = 0x40
    if (opts.power) {
        tempByte |= 1 << 3
    }
    if (opts.pullups) {
        tempByte |= 1 << 2
    }
    if (opts.aux) {
        tempByte |= 1 << 1
    }
    if (opts.cs) {
        tempByte |= 1
    }

    this.port.write(new Uint8Array([tempByte]))
    let done = false
    async.until(
        () => done,
        (cb) => {
            if (this.inputQueue.length < 1) {
                setTimeout(cb, 10)
            } else {
                if (this.inputQueue.join('').indexOf('\u0001') !== -1) {
                    this._flush()
                    done = true

                    /**
                     * This is an event emitted when I2C config is complete
                     * 
                     * @event I2C_configured
                     */
                    this.emit('I2C_configured')
                    cb()
                }
            }
        },
        /**
         * This is called when I2C config is complete or has failed
         *
         * @callback I2cConfigCallback
         * @param {Error} error - null if sucessful
         */
        callback
    )
}

/**
 * Writes I2C data to the BusPirate
 * @method i2cWrite
 * @param {byte} register - the register to write to
 * @param {Array} bytes - bytes to write
 * @param {I2cWriteCallback} callback - called on completion or error
 */
i2c.i2cWrite = function(register, bytes, callback) {
    if (bytes.length > 16) {
        return
    }

    commandByte = 0x10 | (bytes.length - 1);
    this.port.write([commandByte])
    let done = false
    async.until(
        () => done,
        (cb) => {
            if (this.inputQueue.length < 1) {
                setTimeout(cb, 50)
            } else {
                if (this.inputQueue.join('').indexOf('\u0001') !== -1) {
                    this._flush()
                    done = true
                    cb()
                }
            }
        },
        () => {
            let byteWritten
            async.eachOfSeries(
                bytes,
                (byte, key, cb3) => {
                    byteWritten = false
                    this.port.write([byte])
                    async.until(
                        () => byteWritten,
                        (cb2) => {
                            if (this.inputQueue.length < 1) {
                                setTimeout(cb2, 50)
                            } else {
                                if (this.inputQueue.join('').indexOf('\u0001') !== -1) {
                                    this._flush()
                                    byteWritten = true
                                    cb3()
                                }
                            }
                        },
                        cb3
                    )
                },
                /**
                 * Called when the I2C write finishes or errors
                 *
                 * @callback I2cWriteCallback
                 * @param {Error} error - null if sucessful
                 */
                callback
            )
        }
    )
}

/**
 * Reads the designated # of data bytes from the I2C device at address from the given register
 * 
 * @method i2cReadFrom
 * @param {Byte} address -- the address of the device
 * @param {Byte} register -- the register to read from
 * @param {Number} numBytes -- number of bytes to be read (default 1)
 */
i2c.i2cReadFrom = function(address, register, numBytes = 1) {
    if (numBytes > 4096) {
        throw new Error('numBytes must be <= 4096')
    }
}


module.exports = i2c