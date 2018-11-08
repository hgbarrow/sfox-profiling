/*
    Limited SFOX api wrapper - currently only a few features are built out and error handling is minimal
    Henry Barrow - 11/7/2018
    Composite.ai
*/
const axios = require('axios');

function SFOX(apiKey) {
    this.endpoint = "api.sfox.com";
    this.apiVersion = "v1";
    this.apiKey = apiKey + ':';
}

SFOX.prototype.urlFor = function(resource) {
    return "https://" + this.endpoint + "/" + this.apiVersion + "/" + resource;
}

SFOX.prototype.get = function(resource) {
    resource = resource.toLowerCase();
    const url = this.urlFor(resource);
    return axios({
        method: 'get',
        url: url,
        auth: {username: this.apiKey, password: "",},
    }).catch((error) => {
        console.log(error.response.data)
    });
}

SFOX.prototype.post = function(resource, data) {
    resource = resource.toLowerCase();
    const url = this.urlFor(resource);
    return axios.post(url, data, {
        auth: {
            username: this.apiKey,
            password: "",
        }
    }).catch((error) => {
        console.log(error.response.data)
    });
}

SFOX.prototype.orderbook = async function(pair) {
    const market = this.convertPair(pair);
    const resource = "markets/orderbook/" + market;
    let response = await this.get(resource);
    return response.data;
}

SFOX.prototype.balance = async function() {
    resource = "user/balance";
    let response = await this.get(resource);
    return response.data;
}

SFOX.prototype.convertPair = function(pair) {
    return pair.replace('/', '').toLowerCase();
}

SFOX.prototype.placeLimitOrder = async function(action, pair, amount, price) {
    const resource = action === 'buy' ? 'orders/buy' : 'orders/sell';
    data = {
        "quantity": amount.toString(),
        "currency_pair": this.convertPair(pair),
        "price": price.toString(),
        "algorithm_id": 200,
    }
    let response = await this.post(resource, data)
    return response.data;
}

SFOX.prototype.getOrderStatus = async function(orderId) {
    const resource = 'order/' + orderId.toString();
    let response = await this.get(resource);
    return response.data;
}

module.exports = SFOX;

