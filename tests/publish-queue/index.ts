require('dotenv').config();
import { ConfirmChannel } from 'amqplib';
import connection from '../../src/services/amqp';

// const data = [{ _id: '100058146744440', name: 'asdsd', link: '100058146744440' }];
const data = [{ _id: '100058146744440', name: 'asdsd', link: '100000308450921' }];

const channelWrapper = connection.createChannel({
  name: 'aa',
  json: true,
  setup: async (channel: ConfirmChannel) => {
    try {
      await channel.assertExchange('fb_bot', 'direct', { durable: true });
      await channel.assertQueue('fb_bot', { durable: true });
      await channel.prefetch(1);
      await channel.bindQueue('fb_bot', 'fb_bot', 'fb');
    } catch (err) {}
  },
});

channelWrapper.publish('fb_bot', 'fb', data);
