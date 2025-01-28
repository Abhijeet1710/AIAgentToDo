const express = require('express');
const cors = require('cors');
const { connectToDB, chat } = require('./gemeni-chat');

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/v1/chat', async (req, res) => {
  // do something
  const body = req.body;
  // console.log(body);
  const {messages, output, code} = await chat(body.messages);
  console.log("--------------------------------------------------------------------------------");
  res.status(code).json({ messages, output });
});

app.listen(3000, () => {    
  connectToDB();
  console.log('Server is running on port 3000');
});