var BusPirate = require('../BusPirate')

var busPirate = new BusPirate({
  port: '/dev/tty.usbmodem00000001'
})

let reset = false

busPirate.on('open', () => {
  if(!reset){
    reset = true
    busPirate.reset()
  } else {
    process.exit()
  }
})