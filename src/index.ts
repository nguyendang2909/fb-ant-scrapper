import loggerFactory from './lib/logger-factory';
import mongoose from 'mongoose';
import FbCrawler from './modules/crawler';
import { FB_ANT_DB_NAME, FB_ANT_DB_PASS, FB_ANT_DB_USER, MONGO_URI } from './config';
import amqpConnection from './services/amqp';
import delay from 'delay';

const logger = loggerFactory.getLogger(__filename);

(async () => {
  try {
    const db = mongoose.connection;

    const fbCrawler = new FbCrawler();

    db.on('connected', () => {
      logger.info({ message: 'MongoDB connected!' });
    });

    db.on('disconnected', () => {
      logger.info({ message: 'MongoDB disconnected!' });
    });
    mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      user: FB_ANT_DB_USER,
      pass: FB_ANT_DB_PASS,
      dbName: FB_ANT_DB_NAME,
      useFindAndModify: false,
      useCreateIndex: true,
    });
    logger.info({ message: 'Application initialized' });

    await fbCrawler.openBrowser();
    await fbCrawler.newPage();
    await fbCrawler.loginFb();

    amqpConnection.createChannel({
      name: 'basic subscriber',
      json: true,
      setup: async (channel) => {
        try {
          await channel.assertExchange('fb_bot', 'direct', { durable: true });
          await channel.assertQueue('fb_bot', { durable: true });
          await channel.prefetch(1);
          await channel.bindQueue('fb_bot', 'fb_bot', 'fb');
          await channel.consume('fb_bot', async (msg) => {
            const fbSubjects = JSON.parse(msg.content.toString());
            await Promise.all([fbCrawler.safeCrawl(fbSubjects), delay(1000 * 60 * 30)]);
            await channel.ack(msg);
          });
        } catch (err) {
          logger.error({ message: err.stack || err });
        }
      },
    });
  } catch (err) {
    logger.error({ message: err.stack || err });
  }
})();
