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
            let message = this.inputQueue.fetchString(4)
            if (message && message == 'I2C1') {
                this.inputQueue.flush()
                this._i2c = true

                /**
                 * I2C_ready event - signals that the BusPirate is ready for I2C commands
                 *
                 * @event I2C_ready
                 */
                this.emit('I2C_ready')
                cb()

                // check for accidental reset
            } else if (message && message == 'BBIO') {
                this.inputQueue.flush()
                this.port.write([0x02], () => { setTimeout(cb, 10) })
                this._i2c = false
            } else {
                setTimeout(cb, 10)
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
            let message = this.inputQueue.fetchBytes(1)
            if (message && message[0] == 0x01) {
                this.inputQueue.flush()
                done = true

                /**
                 * This is an event emitted when I2C config is complete
                 * 
                 * @event I2C_configured
                 */
                this.emit('I2C_configured')
                cb()
            } else {
                setTimeout(cb, 10)
            }
        }
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
    if (bytes.length > 14) {
        throw new Error('Can only write 14 bytes at a time')
    }

    commandByte = 0x10 | (bytes.length - 1);
    this.port.write([commandByte])
    let done = false
    async.until(
        () => done,
        (cb) => {
            let byte = this.inputQueue.fetchBytes(1)
            if (byte && byte[0] == 1) {
                this.inputQueue.flush()
                done = true
                cb()
            } else {
                setTimeout(cb, 10)
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
                            let ack = this.inputQueue.fetchBytes(1)
                            if (ack && ack[0] == 1) {
                                byteWritten = true
                                cb3()
                            } else {
                                setTimeout(cb2, 10)
                            }
                        },
                        cb3
                    )
                },
                () => {
                    this.emit('i2c_write_complete')
                }
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

    let commandBytes = new Uint8Array(7)

    // set byte 1 to 0x08 (read, then write command)
    commandBytes[0] = 0x08

    // set byte 2 and 3 to 0x00 and 0x02 (number of bytes to write)
    commandBytes[1] = 0x00
    commandBytes[2] = 0x02

    // set byte 4 and 5 to the number of bytes to read
    commandBytes[3] = numBytes >> 8
    commandBytes[4] = numBytes | 0x00

    // add on address and register (bytes to write)
    commandBytes[5] = address | 0x00
    commandBytes[6] = register | 0x00

    // write the command to the BusPirate
    this.port.write(commandBytes)

    let acked = false
    async.until(
        () => acked,
        (cb) => {
            let message = this.inputQueue.fetchBytes(1)
            if (message && message[0] == 0x01) {
                acked = true
                this._i2cActiveRead = true
                this.emit('i2c_data_start')
                collectBytes()
                cb()
            } else if (message && message[0] == 0) {
                this.inputQueue.flush()
                acked = true
                this.emit('i2c_read_error')
                cb()
            } else {
                setTimeout(cb, 10)
            }
        }
    )

    // wait for bytes and emit them
    // keep count, emit end on correct # of bytes
    let count = 0,
        done = false
    let collectBytes = (data) => {
        let bytes = this.inputQueue.fetchBytes(1)
        if (bytes) {
            count++
            this.emit('i2c_read_data', bytes)
            if (count == numBytes) {
                this.emit('i2c_read_complete')
            } else {
                this.port.once('data', collectBytes)
            }
        } else {
            this.port.once('data', collectBytes)
        }
    }
}


module.exports = i2c