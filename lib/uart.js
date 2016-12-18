/** Bus Pirate UART binary mode
 * @see {@link http://dangerousprototypes.com/docs/Bitbang}
 * @see {@link http://dangerousprototypes.com/docs/UART_%28binary%29}
 */
let uart = {};

/** Initialize UART */
uart.uartInit = function() {
  console.log('starting UART');

  // Exit to bitbanging mode by sending 0x00.
  // Enter UART mode by sending 0x03.
  // The expected answer is "ART1".
  this.port.write([0x00, 0x03]);
};

/** Set UART speed
 * @param {Number} speed - 300 (default), 1200, 2400, 4800, 9600, 19200, 31250,
 *                         38400, 57600, or 115200;
 */
uart.uartSetSpeed = function(speed) {
  let speedByte = 0x60;

  if (speed === 1200) {
    speedByte |= 0x01;
  } else if (speed === 2400) {
    speedByte |= 0x02;
  } else if (speed === 4800) {
    speedByte |= 0x03;
  } else if (speed === 9600) {
    speedByte |= 0x04;
  } else if (speed === 19200) {
    speedByte |= 0x05;
  } else if (speed === 31250) {
    speedByte |= 0x06;
  } else if (speed === 38400) {
    speedByte |= 0x07;
  } else if (speed === 57600) {
    speedByte |= 0x08;
  } else if (speed === 115200) {
    speedByte |= 0x10;
  }

  this.port.write([speedByte])
}

/** Configure UART
 *
 * The configuration object is expected to have one or more of the following
 * properties:
 *
 * pinOutput: HiZ (default) or 3V3;
 * databitsParity: 8/N (default), 8/E, 8/O, or 9/N;
 * stopBits: 1 (default) or 2;
 * polarity: idleHigh (default) or idleLow;
 *
 * @param {Object} opts - Configuration object.
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
 *
 * @param {Boolean} rxEcho - "false" suppresses received data (default);
 *                           "true" echos received data.
 */
uart.uartSetRxEcho = function (rxEcho) {
  let echoByte = 0x03;

  if (rxEcho) {
    echoByte = 0x02;
  }

  this.port.write([echoByte]);
};

/** Configure peripherals
 * @param {Object} opts - Configuration object with one or more of the following
 *                        properties:
 *                        power: true or false (default)
 *                        pullups: true or false (default)
 *                        aux: true or false (default)
 *                        cs: true or false (defautl)
 */
uart.uartSetPeripherals = function (opts) {
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
