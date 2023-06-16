const express = require('express');
const app = express();
const amqp = require('amqplib');
const config = require('./config');
const readline = require('readline');

async function consumeFriendRequests() {
  const connection = await amqp.connect(config.rabbitMQ.url);
  const channel = await connection.createChannel();

  const exchangeName = config.rabbitMQ.friendExchangeName;
  await channel.assertExchange(exchangeName, 'direct');

  const q = await channel.assertQueue('FriendRequestQueue');

  await channel.bindQueue(q.queue, exchangeName, 'friendRequest');

  channel.consume(q.queue, async (msg) => {
    const data = JSON.parse(msg.content);
    console.log('Received friend request:', data);

    const response = {
      requestId: data.requestId,
      status: 'pending', // Initial status indicating user's response is pending
    };

    const userResponse = await getUserResponse();
    response.status = userResponse ? 'accepted' : 'rejected';

    const responseExchangeName = config.rabbitMQ.friendExchangeName;
    await channel.assertExchange(responseExchangeName, 'direct');
    await channel.publish(
      responseExchangeName,
      'friendRequestResponse',
      Buffer.from(JSON.stringify(response)),
      { persistent: true }
    );

    console.log('Friend request response sent:', response);

    channel.ack(msg);
  });
}

async function getUserResponse() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Friend request received. Do you accept? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

consumeFriendRequests();

app.listen(3004, () => {
  console.log('Notification service running on port 3004');
});

module.exports = app;
