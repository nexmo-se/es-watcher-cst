import { neru } from 'neru-alpha';
import express from 'express';
const app = express();
const port = process.env.NERU_APP_PORT;

import { sendEmail } from './services/email.js';
import { getValues } from './services/google.js';
import { basicAuth } from './services/auth.js';
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
    let string = ``;
    const alerts = req.body;
    const time = req.query.time;
    const alertsFormatted = await formatAlerts(alerts);
    string += `<p>2FA / Verify Suspicious traffic - More than 100 SMS sent to short number ranges in the last 24h:</p>`;
    alertsFormatted.forEach((customerWithAlert) => {
      string += `<h3>Alerts for ${customerWithAlert.name}</h3>\n`;
      string += `API Key / SenderID / Country / NetworkCode / NetworkName / NetworkType / Prefixes / Traffic`;
      customerWithAlert.alerts.forEach((alert) => (string += `<p>${alert}<p>`));
    });
    sendEmail(string, time);
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
  let string = ``;
  string += `(topic:event_hub_all-mt) AND !d.net:(TOLL OR US-VIRTUAL) AND d.acc:(`;
  try {
    const { apiKeys, names } = await getValues(process.env.spreadSheetId, ['apikey!A2:A', 'apikey!B2:B']);
    if (names && apiKeys) formatCustomerAccounts(names, apiKeys);
    apiKeys.forEach((acc, index) => {
      if (index < apiKeys.length - 1) {
        string += `${acc} OR `;
      } else {
        string += `${acc}`;
      }
    });
    string += `) AND !d.to:*.* AND @timestamp:[now-1440m TO now-4m]`;

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
      return customerJson[i].name;
    }
  }
}

const formatAlerts = async (alerts) => {
  const alertsFormatted = [];

  return new Promise(async (res, rej) => {
    for (const alert of alerts) {
      console.log(alert);

      const apikey = alert.key.split(' /')[0];
      const customer = await findCustomer(apikey);
      if (!alertsFormatted.find((e) => e.name === customer)) {
        alertsFormatted.push({ name: customer, alerts: [`${alert.key} - ${alert.doc_count}`] });
      } else {
        const found = alertsFormatted.find((e) => e.name === customer);
        found.alerts.push(`${alert.key} - ${alert.doc_count}`);
      }
    }
    res(alertsFormatted);
  });
  // alerts.forEach(async (alert) => {
  //   const apikey = alert.key.split(' /')[0];
  //   const customer = await findCustomer(apikey);
  //   if (!alertsFormatted.find((e) => e.name === customer)) {
  //     alertsFormatted.push({ name: customer, alerts: [`${alert.key} - ${alert.doc_count}`] });
  //   } else {
  //     const found = alertsFormatted.find((e) => e.name === customer);
  //     found.alerts.push(`${alert.key} - ${alert.doc_count}`);
  //   }
  // });
  //   res(alertsFormatted);
  // });

  // console.log(alertsFormatted);

  // return alertsFormatted;
};

const formatCustomerAccounts = async (names, apiKeys) => {
  let temp = [];
  for (let i = 0; i < names.length; i++) {
    if (!temp.find((e) => e.name === names[i])) {
      temp.push({ name: names[i], keys: [apiKeys[i]] });
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
