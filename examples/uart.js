var BusPirate = require('../BusPirate');

var busPirate = new BusPirate({
  port: '/dev/buspirate'
});

busPirate.on('open', () => {
  busPirate.start();
});

busPirate.on('ready', () => {
  busPirate.uartInit();
  busPirate.uartSetSpeed(1200);
  busPirate.uartConfig({
    pinOutput: "3V3",
    databitsParity: "8/N",
    stopBits: 1,
    polarity: "idleHigh"
  });
  busPirate.uartSetPeripherals({
    power: true
  });
  busPirate.uartSetRxEcho(true);
  busPirate.uartWrite(Buffer.from("12345"));
});

process.on('SIGINT', function(){
  busPirate.reset();
  setTimeout(() => { process.exit(); }, 1000);
});
