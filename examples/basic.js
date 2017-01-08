var BusPirate = require('../BusPirate')

var busPirate = new BusPirate({
    port: '/dev/tty.usbserial-AI03KY7Z'
})

busPirate.on('ready', () => {
    console.log('bus pirate ready')
    busPirate.i2cInit()
})

busPirate.on('I2C_ready', () => {
    console.log('i2c ready')
    busPirate.i2cConfig({
        power: true
    })
})

busPirate.on('I2C_configured', () => {
    console.log('i2c configured')
    busPirate.on('i2c_data_start', () => console.log('i2c read started'))
    busPirate.on('i2c_read_data', (data) => {
        console.log('read: ' + data[0])
    })
    busPirate.on('i2c_read_complete', () => {
        console.log('i2c read completed')
        i2cWriteTest()
    })
    busPirate.i2cReadFrom(0x52, 0x92, 1)
})

function i2cWriteTest() {
    busPirate.on('i2c_write_complete', () => {
        console.log('i2c write complete')
    })

    console.log('i2c write starting')
    busPirate.i2cWrite(0x52, [0x81, 0x00])
}

busPirate.start()

process.on('SIGINT', function() {
    busPirate.reset()
    process.exit()
})