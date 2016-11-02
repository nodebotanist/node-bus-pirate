var BusPirate = require('../BusPirate')

var busPirate = new BusPirate({
  port: '/dev/tty.usbmodem00000001'
})

busPirate.on('open', () => {
  busPirate.start()
})

busPirate.on('ready', () => {
  busPirate.i2cInit()
})