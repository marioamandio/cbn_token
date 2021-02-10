const redis = require("redis");

const CHANNELS = {
  TEST: "TEST",
  BLOCKCHAIN: "BLOCKCHAIN",
  TRANSACTION: "TRANSACTION",
};
class PubSub {
  constructor({ blockchain, transactionPool }) {
    this.blockchain = blockchain;
    this.publisher = redis.createClient();
    this.subscriber = redis.createClient();
    this.transactionPool = transactionPool;

    this.subscribeToChannels();

    this.subscriber.on("message", (channel, message) => {
      this.handleMessage(channel, message);
    });
  }

  subscribeToChannels() {
    Object.values(CHANNELS).forEach((channel) => {
      this.subscriber.subscribe(channel);
    });
  }

  publish({ channel, message }) {
    this.subscriber.unsubscribe(channel, () => {
      this.publisher.publish(channel, message, () => {
        this.subscriber.subscribe(channel);
      });
    });
  }

  broadcastChain() {
    this.publish({
      channel: CHANNELS.BLOCKCHAIN,
      message: JSON.stringify(this.blockchain.chain),
    });
  }

  broadcastTransaction(transaction) {
    this.publish({
      channel: CHANNELS.TRANSACTION,
      message: JSON.stringify(transaction),
    });
  }

  handleMessage(channel, message) {
    const parsedMessage = JSON.parse(message);
    console.log(`message received. Channel: ${channel}, message: ${message}`);

    switch (channel) {
      case CHANNELS.BLOCKCHAIN:
        this.blockchain.replaceChain(parsedMessage, true, () => {
          this.transactionPool.clearBlockchainTransactions({
            chain: parsedMessage,
          });
        });
        break;
      case CHANNELS.TRANSACTION:
        this.transactionPool.setTransaction(parsedMessage);
      default:
        return;
    }
  }
}

module.exports = PubSub;
