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
0001xxxx – Bulk I2C write, send 1-16 bytes (0=1byte!)
Bulk I2C allows multi-byte writes. The Bus Pirate expects xxxx+1 data bytes. Up to 16 data bytes can be sent at once. Note that 0000 indicates 1 byte because there’s no reason to send 0.

BP replies 0×01 to the bulk I2C command. After each data byte the Bus Pirate returns the ACK (0x00) or NACK (0x01) bit from the slave device.
*/

i2c.i2cWrite = function(register, bytes) {
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
                    console.log('Ack!')
                    this._flush()
                    done = true
                    cb()
                }
            }
        }
    )
}


module.exports = i2c