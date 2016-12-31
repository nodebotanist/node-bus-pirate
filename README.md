# bus-pirate

Control a Bus Pirate with Node!

Don't know what that is? [Check it out](http://dangerousprototypes.com/docs/Bus_Pirate)

I'm testing this with the v3.6 and the v4 and Node 7.x

Currently working

.start()
.reset()
'ready' event

i2cInit()
i2cConfig({
  power: true,
  pullups: true,
  aux: true,
  cs: true
})
i2cWrite(address, bytesArray)

## Roadmap

* Major refactor w/async [DONE]
* Find a way to add unit testing
* Docs (self-generating) [DONE]
* Finish I2C implementation

Thanks to node-serialport for making this all possible <3 

## Contributors

* @nodebotanist