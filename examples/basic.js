var BusPirate = require('../BusPirate')

var busPirate = new BusPirate({
  port: '/dev/tty.usbmodem00000001'
})

busPirate.on('open', () => {
  busPirate.start()
})

busPirate.on('ready', () => {
  console.log(busPirate)
  busPirate.i2cInit()
  busPirate.i2cConfig({
    power: true
  });
  busPirate.i2cWrite(0x7e, [0x1e, 0x40])
})

process.on('SIGINT', function(){
  busPirate.reset()
  process.exit()
})