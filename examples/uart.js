var BusPirate = require('../BusPirate');

var busPirate = new BusPirate({
  port: '/dev/buspirate'
});

busPirate.on('open', () => {
  busPirate.start();
});

busPirate.on('ready', () => {
  console.log(busPirate);
  busPirate.uartInit();
  busPirate.uartSetSpeed(9600);
  // Configuration is all defaults, so it would not be required.
  busPirate.uartConfig({
    pinOutput: "HiZ",
    databitsParity: "8/N",
    stopBits: 1,
    polarity: "idleHigh"
  });
  busPirate.uartSetPeripherals({
    power: true
  });
  busPirate.uartSetRxEcho(true);
});

process.on('SIGINT', function(){
  busPirate.reset();
  setTimeout(() => { process.exit(); }, 1000);
});
