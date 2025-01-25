const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/v1/chat', (req, res) => {
  // do something
  const body = req.body;
  console.log(body);
  res.status(200).json({ message: 'success' });
});

app.listen(3000, () => {    
  console.log('Server is running on port 3000');
});