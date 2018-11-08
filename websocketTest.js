/*
    Monitor SFOX's orderbook WS and compare the message timestamps to the client timestamp
    Henry Barrow - 11/7/2018
    Composite.ai
*/

const WebSocket = require('ws');

let pair;
if (process.argv.length > 2) {
    pair = process.argv[2];
} else {
    pair = "BTC/USD"
}
pair = pair.toLowerCase().replace("/", "");
const subscribeMsg = {
    "type": "subscribe",
    "feeds": ["orderbook.sfox." + pair]
}

function getUniqueExchanges(orderbook) {
    let exchanges = new Set([]);
    orderbook.asks.forEach(function(ask) {
        exchanges.add(ask[2])
    });
    orderbook.asks.forEach(function(bid) {
        exchanges.add(bid[2])
    });
    return exchanges;
}

const ws = new WebSocket('wss://ws.sfox.com/ws');
let lastUpdate = (new Date()).getTime();
ws.on('message', function(data) {
    const timeNow = (new Date()).getTime();
    const message = JSON.parse(data);
    const messageTS = message.timestamp / 1000000;
    // Do something with data
    if (message.payload && message.payload.bids && message.payload.asks) {
        const orderbook = message.payload;
        console.log(getUniqueExchanges(orderbook))
        console.log("Bids:", orderbook.bids.length, "Asks:", orderbook.asks.length)
    } else {
        console.log(message)
    }
    // Print the timestamps
    console.log("SFOX timestamp:", messageTS, "\tReturn timestamp:", 
                timeNow, "difference:", timeNow - messageTS, 'ms\tLast Update:', 
                timeNow - lastUpdate, "ms")
    lastUpdate = timeNow;
});



ws.on('open', function open() {
    ws.send(JSON.stringify(subscribeMsg));
});

