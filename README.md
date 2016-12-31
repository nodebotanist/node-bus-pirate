# bus-pirate

Control a Bus Pirate with Node!

Don't know what that is? [Check it out](http://dangerousprototypes.com/docs/Bus_Pirate)

I'm testing this with the v3.6 and the v4 and Node 7.x

## Currently working
### General
```
.start()
.reset()
'ready' event
```

### I2C
```
i2cInit()
i2cConfig({
  power: true,
  pullups: true,
  aux: true,
  cs: true
})
i2cWrite(address, bytesArray)
```

### UART
```
busPirate.uartInit();
busPirate.uartSetSpeed(9600);
busPirate.uartConfig({
  pinOutput: "HiZ",
  databitsParity: "8/N",
  stopBits: 1,
  polarity: "idleHigh"
});
busPirate.uartSetPeripherals({
  power: true,
  pullups: false,
  aux: false,
  cs: false
});
busPirate.uartSetRxEcho(true);
busPirate.uartWrite(["abcd"]);
```

## Roadmap

* Major refactor w/async [DONE]
* Find a way to add unit testing
* Docs (self-generating) [DONE]
* Finish I2C implementation

Thanks to node-serialport for making this all possible <3 

## Contributors

* @nodebotanist
* @hannes-hochreiner
