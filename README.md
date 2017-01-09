# bus-pirate

Control a Bus Pirate with Node!

Don't know what that is? [Check it out](http://dangerousprototypes.com/docs/Bus_Pirate)

I'm testing this with the v3.6 and the v4 and Node 7.x

## Currently working
### General
```
BusPirate.start()
BusPirate.reset()
'ready' event -- BusPirate.on('ready', () => {})
```

### I2C
```
BusPirate.i2cInit()
BusPirate.i2cConfig({
  power: true,
  pullups: true,
  aux: true,
  cs: true
})
BusPirate.i2cWrite(address, bytesArray)
```

### UART

#### **Removed for refactoring until 2.3.5**

```
BusPirate.uartInit();
BusPirate.uartSetSpeed(9600);
BusPirate.uartConfig({
  pinOutput: "HiZ",
  databitsParity: "8/N",
  stopBits: 1,
  polarity: "idleHigh"
});
BusPirate.uartSetPeripherals({
  power: true,
  pullups: false,
  aux: false,
  cs: false
});
BusPirate.uartSetRxEcho(true);
BusPirate.uartWrite(["abcd"]);
```

## Roadmap

* see [issues](https://github.com/nodebotanist/node-bus-pirate/issues) and [projects](https://github.com/nodebotanist/node-bus-pirate/projects)

Thanks to node-serialport for making this all possible <3 

## Contributors

* @nodebotanist
* @hannes-hochreiner
