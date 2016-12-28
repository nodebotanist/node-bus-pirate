const async = require('async')

i2c = {};

i2c._i2c = false

i2c.i2cInit = function(callback) {
    console.log('starting I2C')
    this.port.write([0x02])
    async.until(
        () => this._i2c,
        (cb) => {
            if (this.inputQueue.length < 1) {
                setTimeout(cb, 50)
            } else {
                // check for accidental reset
                if (this.inputQueue[0].indexOf('BBIO1') !== -1) {
                    this._flush()
                    this.port.write([0x02], () => { setTimeout(cb, 100) })
                    this.i2c = false
                } else if (this.inputQueue.join('').indexOf('I2C1') !== -1) {
                    this._flush()
                    this.emit('I2C_ready')
                    this._i2c = true
                    cb()
                }
            }
        },
        callback
    )
}

i2c.i2cConfig = function(opts, callback) {
    if (!opts) {
        return
    }
    let tempByte = 0x40
    if (opts.power) {
        tempByte |= 1 << 3
        console.log('Power turning ON')
    }
    if (opts.pullups) {
        tempByte |= 1 << 2
        console.log('Pullup resistors ENABLED')
    }
    if (opts.aux) {
        tempByte |= 1 << 1
    }
    if (opts.cs) {
        tempByte |= 1
    }

    this.port.write([tempByte])
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
        callback
    )
}

/*
First send the write then read command (0x08)
The next two bytes (High8/Low8) set the number of bytes to write (0 to 4096)
The next two bytes (h/l) set the number of bytes to read (0 to 4096)
If the number of bytes to read or write are out of bounds, the Bus Pirate will return 0x00 now
Next, send the bytes to write. Bytes are buffered in the Bus Pirate, there is no acknowledgment that a byte is received.
The Bus Pirate sends an I2C start bit, then all write bytes are sent at once. If an I2C write is not ACKed by a slave device, then the operation will abort and the Bus Pirate will return 0x00 now
Read starts immediately after the write completes. Bytes are read from I2C into a buffer at max I2C speed (no waiting for UART). All read bytes are ACKed, except the last byte which is NACKed, this process is handled internally between the Bus Pirate and the I2C device
At the end of the read process, the Bus Pirate sends an I2C stop
The Bus Pirate now returns 0x01 to the PC, indicating success
Finally, the buffered read bytes are returned to the PC
*/

i2c.i2cWrite = function(register, bytes) {
    let lowByteLength = 0x00 | bytes.length
    let highByteLength = 0x00 | (bytes.length >> 4)
    let commandBytes = [0x08, highByteLength, lowByteLength, 0x00, 0x00, register]
    commandBytes.concat(bytes)
    console.log(commandBytes)
    this.port.write(commandBytes)
}


module.exports = i2c