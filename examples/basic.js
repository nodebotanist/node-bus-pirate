var BusPirate = require('../BusPirate')

var busPirate = new BusPirate({
    port: '/dev/tty.usbserial-AI03KY7Z'
})

busPirate.on('open', () => {
    busPirate.start()
})

busPirate.on('ready', () => {
    busPirate.i2cInit(() => {
        busPirate.i2cConfig({
            power: true
        }, () => {
            console.log('writing')
            busPirate.i2cWrite(0x7e, [0x1e, 0x40])
        });
    })
})

process.on('SIGINT', function() {
    busPirate.reset()
    process.exit()
})