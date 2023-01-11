//import misc
const express = require('express');
const app = express();
const port = 4000;

//import routes
const auth = require('./routes/auth');
const open = require('./routes/open');
const secure = require('./routes/secure');
const admin = require('./routes/admin');

//middleware
app.use('/api/auth',auth);
app.use('/api/open', open);
app.use('/api/secure', secure);
app.use('/api/admin', admin);

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
