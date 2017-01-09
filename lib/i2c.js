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
 * @fires i2c_ready
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
                 * @event i2c_ready
                 */
                this.emit('i2c_ready')
                cb()

                // check for accidental reset
            } else if (message && message == 'BBIO') {
                this.inputQueue.flush()
                this.port.write([0x02], () => { setTimeout(cb, 10) })
                this._i2c = false
            } else {
                setTimeout(cb, 10)
            }
        }
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
 * @fires i2c_configured
 */
i2c.i2cConfig = function(opts) {
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
                 * @event i2c_configured
                 */
                this.emit('i2c_configured')
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
 * @fires i2c_write_complete
 */
i2c.i2cWrite = function(register, bytes) {
    let numBytes = bytes.length
    if (numBytes > 4096) {
        throw new Error('numBytes must be <= 4096')
    }

    let commandBytes = new Uint8Array(6)

    // set byte 1 to 0x08 (read, then write command)
    commandBytes[0] = 0x08

    // set byte 2 and 3 to the number of bytes to write
    commandBytes[1] = numBytes >> 8
    commandBytes[2] = numBytes | 0x00

    // set byte 4 and 5 to the number of bytes to read (0)
    commandBytes[3] = 0x00
    commandBytes[4] = 0x00

    // add on address 
    commandBytes[5] = register | 0x00

    commandBytes = Buffer.from(commandBytes)

    // write the command and bytes to the BusPirate
    this.port.write(Buffer.concat([commandBytes, Buffer.from(bytes)]))

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
            /**
             * This event fires when the write is complete
             * @event i2c_write_complete
             */
            this.emit('i2c_write_complete')
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
 * @fires i2c_read_start
 * @fires i2c_read_error
 * @fires i2c_read_data
 * @fires i2c_read_complete
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

                /**
                 * This event means we are ready to recieve i2c data
                 * @event i2c_read_start
                 */
                this.emit('i2c_read_start')
                collectBytes()
                cb()
            } else if (message && message[0] == 0) {
                this.inputQueue.flush()
                acked = true

                /**
                 * This event means there was an error reading from the i2c device
                 * @event i2c_read_error
                 */
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
            /**
             * This event fires when the i2c device sends nev data
             * @event i2c_read_data
             */
            this.emit('i2c_read_data', bytes)
            if (count == numBytes) {
                /**
                 * This event fires when the i2c read is complete
                 * @event i2c_read_complete
                 */
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