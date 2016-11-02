var BusPirate = require('../BusPirate')

var busPirate = new BusPirate({
  port: '/dev/tty.usbserial-AI03KY7Z'
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