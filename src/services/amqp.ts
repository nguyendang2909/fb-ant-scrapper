import amqp from 'amqp-connection-manager';
import { RABBIT_URL } from '../config';
import loggerFactory from '../lib/logger-factory';

const logger = loggerFactory.getLogger(__filename);

const connection = amqp.connect([RABBIT_URL]);

connection.on('connect', () => {
  logger.info('Kết nối thành công server AMQP!');
});

connection.on('disconnect', (arg) => {
  logger.error({
    message: `Mất kết nối server AMQP!${arg.err.stack || arg.err}`,
  });
});

connection.on('error', (err) => {
  logger.info(`AmqpConnectionManager Error: ${err.stack || err}`);
});

export default connection;
