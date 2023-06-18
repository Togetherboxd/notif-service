const request = require('supertest');
const app = require('../index');
const amqp = require('amqplib');
const config = require('../config');

describe('Notification Service', () => {
  let testChannel;

  beforeAll(async () => {
    const connection = await amqp.connect(config.rabbitMQ.url);
    const channel = await connection.createChannel();

    testChannel = channel;
  });

  afterAll(async () => {
    // Close the AMQP channel after all tests
    await testChannel.close();
  });

  test('should handle a friend request and send the response', async () => {
    const requestPayload = {
      requestId: '123',
      sender: 'senderUser',
      receiver: 'receiverUser',
    };

    // Publish the friend request to the queue
    await testChannel.publish(
      config.rabbitMQ.friendExchangeName,
      'friendRequest',
      Buffer.from(JSON.stringify(requestPayload)),
      { persistent: true }
    );

    // Wait for a brief moment to allow the service to consume the message
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulate user response by sending a POST request to the endpoint
    const response = await request(app)
      .post('/response')
      .send({
        requestId: requestPayload.requestId,
        status: 'accepted',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      requestId: requestPayload.requestId,
      status: 'accepted',
    });
  });
});
