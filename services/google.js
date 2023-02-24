import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
export const getValues = async (spreadsheetId, range) => {
  const auth = new GoogleAuth({
    scopes: 'https://www.googleapis.com/auth/spreadsheets',
  });

  const service = google.sheets({ version: 'v4', auth });
  try {
    const result = await service.spreadsheets.values.batchGet({
      spreadsheetId: spreadsheetId,
      ranges: range,
      majorDimension: 'COLUMNS',
    });

    const numRows = result.data.valueRanges[0].values ? result.data.valueRanges[0].values.length : 0;
    if (numRows) {
      console.log('got result from Google spreadsheet');

      return {
        apiKeys: result.data.valueRanges[0].values[0],
        names: result.data.valueRanges[1].values[0],
        slack: result.data.valueRanges[2].values[0],
      };
    }
  } catch (err) {
    console.log(err);
    throw err;
  }
};
