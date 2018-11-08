/*
    SFOX limit order matching engine profiler

    This simple program profiles SFOX's matching engine speed. This is done in 4 steps:
        1. Check the user's balance and determine if the user has enough funds to buy/sell on LTC/USD.
        2. Place an order through the SFOX REST API.
        3. Connect to the SFOX trades websocket and monitor for the trade.
        4. Periodically poll the SFOX order status endpoint until the trade has been marked filled.
    
    Henry Barrow - 11/7/2018
    Composite.ai
*/
const WebSocket = require('ws');
const SFOX = require('./SFOXwrapper');
const fs = require('fs');

// Global variables
const pair = 'LTC/USD';
const ltcSize = 0.15; // Must be > 5 USD
const buyPrice = 65; // Buying at this price should fill instantly
const sellPrice = 45; // Selling at this price should fill instantly

// Try to read the apiKey from the arguments variables or from './apikey.txt'
let apiKey;
if (process.argv.length > 2) {
    apiKey = process.argv[2];
} else {
    try {
        apiKey = fs.readFileSync('./apikey.txt', 'utf8').toString().split('\n')[0];
    } catch(err) {
        console.log('SFOX API key not found. Place your SFOX API key in a new file called "apikey.txt".\n' + 
                    '>\techo <your_api_key_here> >> apikey.txt')
        process.exit(1);
    }
}

// Initialize a new wrapper with the apiKey
const sfox = new SFOX(apiKey);

async function main() {
    // Subscribe to the Trades channel immediately
    let listener = new WSListener();
    
    // Fetch balances from SFOX API
    let balances = await sfox.balance();
    
    // Determine the trading action based on user's balances
    let action;
    balances.forEach(function(balance) {
        if (balance['currency'] === 'ltc' && balance['available'] > ltcSize) {
            action = 'sell';
        } else if (balance['currency'] === 'usd' && balance['available'] > ltcSize * buyPrice) {
            action = 'buy';
        }
    })
    if (typeof action === 'undefined') {
        console.log(balances)
        console.log("Your SFOX account does not have enough funds to perform this test.")
        process.exit(2);
    }
    // Set the price based on the action
    const price = action == 'sell' ? sellPrice : buyPrice;
    
    // Place the order using the SFOX wrapper
    console.log('Placing a limit order to', action, ltcSize.toString(), 'LTC at a price of $' + price.toString() + '.')
    let order = await sfox.placeLimitOrder(action, 'LTC/USD', ltcSize, price);
    const startTs = (new Date()).getTime(); // Don't start timing until after the order has been placed
    
    console.log('Order Detail:', order)
    
    // Now that we have an order ID, tell the listener to spay special attention to this order
    listener.orderId = order.id; 
    
    // Periodically call the SFOX order status endpoint to see if the order has filled
    let interval = setInterval(() => {
        sfox.getOrderStatus(order.id)
            .then((data) => {
                const endTs = (new Date()).getTime();
                if (data.status_code === 300) {
                    clearInterval(interval);
                    console.log('Status:', data.status, '\tMatching time:', endTs - startTs, 'ms');
                    process.exit(0);
                } else {
                    console.log('Status:', data.status, '\tElapsed time:', endTs - startTs, 'ms');
                }
            })
            .catch((error) => {
                console.log(error);
            });
    }, 500); 
}
main();

// The websocket listener will be running in parallel to the the REST API calls to see if we can identify our trades
// via websocket faster
function WSListener() {
    this.orderId = undefined;
    this.ws = new WebSocket('wss://ws.sfox.com/ws');
    const subscribeMsg = {
        "type": "subscribe",
        "feeds": ["trades.sfox." + sfox.convertPair(pair)]
    }
    let self = this;
    this.ws.on('open', function open() {
        self.ws.send(JSON.stringify(subscribeMsg));
    });
    this.ws.on('message', function(data) {
        const message = JSON.parse(data);
        if (message.hasOwnProperty('payload')) {
            console.log('---------WS MESSAGE--------')
            console.log('watching for order: ', self.orderId);
            console.log(message.payload)
            console.log('---------------------------')
        }
    })
}