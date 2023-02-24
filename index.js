import { neru } from 'neru-alpha';
import express from 'express';
const app = express();
const port = process.env.NERU_APP_PORT;

import { sendEmail } from './services/email.js';
import { getValues } from './services/google.js';
import { basicAuth } from './services/auth.js';
import { sendSlackMessage } from './services/slack.js';
let customersGrouped = [];

const globalState = neru.getGlobalState();

app.use(express.json());

app.get('/_/health', async (req, res) => {
  res.sendStatus(200);
});

app.use(basicAuth);

app.get('/', async (req, res, next) => {
  res.send('hello world').status(200);
});

app.post('/webhook', async (req, res) => {
  try {
    console.log('received webhook');

    // let string = ``;
    const alerts = req.body;
    const time = req.query.time;
    const alertsFormatted = await formatAlerts(alerts);
    // string += `<p>2FA / Verify Suspicious traffic - More than 100 SMS sent to short number ranges in the last 24h:</p>`;
    // alertsFormatted.forEach((customerWithAlert) => {
    //   let string = ``;
    //   string += `<p>2FA / Verify Suspicious traffic - More than 100 SMS sent to short number ranges in the last 24h:</p>`;
    //   string += `<h3>Alerts for ${customerWithAlert.name}</h3>\n`;
    //   string += `API Key / SenderID / Country / NetworkCode / NetworkName / NetworkType / Prefixes / Traffic`;
    //   customerWithAlert.alerts.forEach((alert) => (string += `<p>${alert}<p>`));
    //   sendEmail(string, time, customerWithAlert.name);
    // });

    alertsFormatted.forEach((customerWithAlert) => {
      let string = ``;
      // string += `2FA / Verify Suspicious traffic - More than 100 SMS sent to short number ranges in the last 24h:`;
      // string += `Alerts for ${customerWithAlert.name}\n`;
      string += `API Key / SenderID / Country / NetworkCode / NetworkName / NetworkType / Prefixes / Traffic\n`;
      customerWithAlert.alerts.forEach((alert) => (string += `${alert}\n`));
      // sendEmail(string, time, customerWithAlert.name);
      console.log(customerWithAlert.slackUser);
      if (string.length > 3000) {
        let first = string.substr(0, 3000);
        let second = string.substr(3000, string.length);
        sendSlackMessage(first, time, customerWithAlert.slackUser, customerWithAlert.name);
        sendSlackMessage(second, time, customerWithAlert.slackUser, customerWithAlert.name);
      } else {
        sendSlackMessage(string, time, customerWithAlert.slackUser, customerWithAlert.name);
      }

      // sendSlackMessage(string, time, customerWithAlert.slackUser, customerWithAlert.name);
    });
    // sendEmail(string, time);
    res.sendStatus(200);
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
});

app.get('/result', async (req, res) => {
  const customerString = await globalState.hget('customers', '1');
  const customerJson = await JSON.parse(customerString);
  res.send(customerJson);
});

app.get('/es', async (req, res) => {
  console.log('got request to build query');

  let string = ``;
  string += `(topic:event_hub_all-mt) AND !d.net:(TOLL OR US-VIRTUAL) AND d.acc:(`;
  try {
    const { apiKeys, names, slack } = await getValues(process.env.spreadSheetId, ['apikey!A2:A', 'apikey!B2:B', 'apikey!F2:F']);
    if (names && apiKeys && slack) formatCustomerAccounts(names, apiKeys, slack);
    apiKeys.forEach((acc, index) => {
      if (index < apiKeys.length - 1) {
        string += `${acc} OR `;
      } else {
        string += `${acc}`;
      }
    });
    string += `) AND !d.to:*.* AND @timestamp:[now-1440m TO now-4m]`;
    console.log('got query ' + string);

    res.json({
      request: {
        query: string,
      },
    });
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
});

async function findCustomer(apiKey) {
  const customerString = await globalState.hget('customers', '1');
  const customerJson = await JSON.parse(customerString);
  for (let i = 0; i < customerJson.length; i++) {
    if (customerJson[i].keys.find((key) => key === apiKey)) {
      return { customer: customerJson[i].name, slackUser: customerJson[i].slackUser };
    }
  }
}

const formatAlerts = async (alerts) => {
  const alertsFormatted = [];

  return new Promise(async (res, rej) => {
    for (const alert of alerts) {
      const apikey = alert.key.split(' /')[0];
      const { customer, slackUser } = await findCustomer(apikey);
      if (!alertsFormatted.find((e) => e.name === customer)) {
        alertsFormatted.push({ name: customer, alerts: [`${alert.key} - ${alert.doc_count}`], slackUser: slackUser });
      } else {
        const found = alertsFormatted.find((e) => e.name === customer);
        found.alerts.push(`${alert.key} - ${alert.doc_count}`);
      }
    }
    res(alertsFormatted);
  });
};

const formatCustomerAccounts = async (names, apiKeys, slack) => {
  let temp = [];
  for (let i = 0; i < names.length; i++) {
    if (!temp.find((e) => e.name === names[i])) {
      temp.push({ name: names[i], keys: [apiKeys[i]], slackUser: slack[i] });
    } else {
      const found = temp.find((e) => e.name === names[i]);
      found.keys.push(apiKeys[i]);
    }
  }
  customersGrouped = temp;
  const created = await globalState.hset('customers', {
    ['1']: JSON.stringify(temp),
  });
};

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

// {
// 	"blocks": [
// 		{
// 			"type": "header",
// 			"text": {
// 				"type": "plain_text",
// 				"text": "2FA / Verify Suspicious traffic - More than 100 SMS sent to short number ranges in the last 24h:",
// 				"emoji": true
// 			}
// 		},
// 		{
// 			"type": "section",
// 			"fields": [
// 				{
// 					"type": "mrkdwn",
// 					"text": "*Type:*\n EMEA CSM Managed Suspicious 2FA/Verify traffic - Prefix Alert"
// 				},
// 				{
// 					"type": "mrkdwn",
// 					"text": "*Account Managed by :*\n<javier.molinasanz>"
// 				}
// 			]
// 		},
// 		{
// 			"type": "section",
// 			"fields": [
// 				{
// 					"type": "mrkdwn",
// 					"text": "*Alert:*\n 393d97d7 / Revolut / GB / 23420 / Hutchison 3G Ltd / mobile / 4474017812;"
// 				},
// 				{
// 					"type": "mrkdwn",
// 					"text": "*Count:* 123"
// 				}
// 			]
// 		}
// 	]
// }
