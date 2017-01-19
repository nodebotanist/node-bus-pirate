/**
 * UART module - adds uart function calls to the BusPirate object
 * @module BusPirate/uart
 * @author hannes-hochreiner, nodebotanist
 */


const async = require('async')

let uart = {};

/** Initialize UART
 * @method uartInit
 * @fires uart_ready
 */
uart.uartInit = function() {
    this._uart = false
    this.resetMode()

    this.on('mode_reset', () => {
        this.port.write([0x03]);

        async.until(
            () => this._uart,
            (cb) => {
                let message = this.inputQueue.fetchString(4)
                if (message && message == 'ART1') {
                    this.inputQueue.flush()
                    this._uart = true

                    /**
                     * uart_ready event - signals that the BusPirate is ready for I2C commands
                     *
                     * @event uart_ready
                     */
                    this.emit('uart_ready')
                    cb()

                    // check for accidental reset
                } else if (message && message == 'BBIO') {
                    this.inputQueue.flush()
                    this.port.write([0x03], () => { setTimeout(cb, 10) })
                    this._uart = false
                } else {
                    setTimeout(cb, 10)
                }
            }
        )
    })
};

/** Set UART speed
 * @method uartSetSpeed
 * @param {Number} speed - 300 (default), 1200, 2400, 4800, 9600, 19200, 31250,
 *                         38400, 57600, or 115200;
 * @fires uart_speed_set
 */
uart.uartSetSpeed = function(speed) {
    if (!speed) {
        throw new Error('.uartSetSpeed() requires a speed parameter')
    }
    const UART_BAUD_RATES = {
        '300': 0x00,
        '1200': 0x01,
        '2400': 0x02,
        '4800': 0x03,
        '9600': 0x04,
        '19200': 0x05,
        '31250': 0x06,
        '38400': 0x07,
        '57600': 0x08,
        '115200': 0x10
    }

    if (!UART_BAUD_RATES[speed] && UART_BAUD_RATES[speed] !== 0x00) {
        throw new Error('invalid speed sent to .uartSetSpeed()')
    }

    let speedByte = 0x60 | UART_BAUD_RATES[speed]

    this.port.write([speedByte])

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
                 * @event uart_speed_set
                 */
                this.emit('uart_speed_set')
                cb()
            } else {
                setTimeout(cb, 10)
            }
        }
    )
}

/** Configure UART
 * @method uartConfig
 * @param {Object} opts - Configuration object.
 * @param {String} opts.pinOutput - HiZ (default) or 3V3
 * @param {String} opts.databitsParity - 8/N (default), 8/E, 8/O, or 9/N
 * @param {Number} opts.stopBits - 1 (default) or 2
 * @param {String} opts.polarity - idleHigh (default) or idleLow
 */
uart.uartConfig = function(opts) {
    if (typeof opts === "undefined") {
        return;
    }

    let optByte = 0x80;

    if (typeof opts.pinOutput !== "undefined") {
        if (opts.pinOutput === "3V3") {
            optByte |= 0x10;
        }
    }

    if (typeof opts.databitsParity !== "undefined") {
        if (opts.databitsParity === "8/E") {
            optByte |= 0x01 << 2;
        } else if (opts.databitsParity === "8/O") {
            optByte |= 0x02 << 2;
        } else if (opts.databitsParity === "9/N") {
            optByte |= 0x03 << 2;
        }
    }

    if (typeof opts.stopBits !== "undefined") {
        if (opts.stopBits === 2) {
            optByte |= 0x01 << 1;
        }
    }

    if (typeof opts.polarity !== "undefined") {
        if (opts.polarity === "idleLow") {
            optByte |= 0x01;
        }
    }

    this.port.write([optByte]);
};

/** Set receive echo switch
 * @method uartSetRxEcho
 * @param {Boolean} rxEcho - "false" suppresses received data (default);
 *                           "true" echos received data.
 */
uart.uartSetRxEcho = function(rxEcho) {
    let echoByte = 0x03;

    if (rxEcho) {
        echoByte = 0x02;
    }

    this.port.write([echoByte]);
};

/** Configure peripherals
 * @method uartSetPeripherals
 * @param {Object} opts - Configuration object with one or more of the following
 *                        properties:
 * @param {boolean} opts.power - default is false
 * @param {boolean} opts.pullups - default is false
 * @param {boolean} opts.aux - default is false
 * @param {boolean} opts.cs - default is false
 */
uart.uartSetPeripherals = function(opts) {
    if (typeof opts === "undefined") {
        return;
    }

    let optByte = 0x40;

    if (opts.power) {
        optByte |= 0x08;
    }

    if (opts.pullups) {
        optByte |= 0x04;
    }

    if (opts.aux) {
        optByte |= 0x02;
    }

    if (opts.cs) {
        optByte |= 0x01;
    }

    this.port.write([optByte]);
};

/** Write to UART
 * @method uartWrite
 * @param {Buffer} data - buffer with data to be written.
 */
uart.uartWrite = function(data) {
    if (typeof data === "undefined") {
        return;
    }

    let cntr = 0;
    let maxLength = 16;

    while (cntr < data.length) {
        let cnt = Math.min(maxLength, data.length - cntr);
        let buf = Buffer.alloc(cnt + 1);

        buf[0] = 16 + (cnt - 1);
        cntr += data.copy(buf, 1, cntr, cntr + cnt);
        this.port.write(buf);
    }
};

module.exports = uart;