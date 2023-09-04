import axios from 'axios';

export const sendSlackMessage = async (text, time, slackUser, name) => {
  return new Promise((res, rej) => {
    var data = JSON.stringify({
      text: 'Alert from Elastic Search',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `2FA / Verify Suspicious traffic - More than 100 SMS sent to short number ranges in the last 24h: ${time} ${name}`,
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Type:*\n EMEA CSM Managed Suspicious 2FA/Verify traffic - Prefix Alert  `,
            },
            {
              type: 'mrkdwn',
              text: `*Account Managed by :*\n<@${slackUser}>`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: `${text}`,
          },
        },
      ],
    });

    var config = {
      method: 'post',
      url: `https://hooks.slack.com/services/${process.env.slackToken}`,
      // url: `https://hooks.slack.com/services/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`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: data,
    };
    axios(config)
      .then(function (response) {
        res(response.data);
        console.log(JSON.stringify(response.data));
      })
      .catch(function (error) {
        console.log(error.response.data);
        console.log(error.response.status);
        rej(error.response.data);
      });
  });
};
