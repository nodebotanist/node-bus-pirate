const util = require('util')
const EventEmitter = require('events').EventEmitter
const SerialPort = require('serialport')

const i2c = require('./lib/i2c.js')

function BusPirate(options){
  EventEmitter.call(this)
  this.port = new SerialPort(
    options.port,
    {
      baudRate: 115200,
      //parser: SerialPort.parsers.readline('\n')
    }
  )
  this._ready = false

  this.port.on('open', function(){ this.emit('open') }.bind(this))

  this.port.on('data', function (data){
    data = Buffer.from(data).toString()
    console.log(data)
    if(data == 'BBIO1'){
      this.ready()
    }
  }.bind(this))
}

util.inherits(BusPirate, EventEmitter)

BusPirate.prototype.reset = function(){
  console.log('resetting')
  this.port.write([0x0F])
  this.port.open(()=>{ this.emit('open')})
}

BusPirate.prototype.start = function(){
  console.log('entering bitbang mode')
  this.port.write([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
}

BusPirate.prototype.ready = function(){
  if(!this._ready){
    this.emit('ready')
    this._ready = true
  }
}

Object.assign(BusPirate.prototype, i2c)

module.exports = BusPirate