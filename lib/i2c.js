let i2c = {
  i2cInit: function(){
    console.log('starting I2C')
    this.port.write([0x02])
  }
}

module.exports = i2c