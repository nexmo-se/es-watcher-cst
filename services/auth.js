export const basicAuth = async (req, res, next) => {
  const auth = { login: process.env.username, password: process.env.password }; // change this
  //   if (!req.headers.authorization) res.status(401).send('Authentication required.');
  // parse login and password from headers
  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
  // Verify login and password are set and correct
  if (login && password && login === auth.login && password === auth.password) {
    // Access granted...
    return next();
  } else {
    res.status(401).send('Authentication required.');
  }
};
