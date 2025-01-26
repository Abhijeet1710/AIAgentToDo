require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { MongoClient } = require("mongodb");
const readLineSync = require("readline-sync");

const apiKey = process.env.GEMENI_API_KEY;
const mongoUri = process.env.MONGO_URI;

const genAI = new GoogleGenerativeAI(apiKey);
const aiClient = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const mongoClient = new MongoClient(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let db;
let todosCollection;

async function connectToDB() {
  try {
    await mongoClient.connect();
    db = mongoClient.db("AIAgentToDo");
    todosCollection = db.collection("todos");
    // console.log(
    //   "--------------------- Connected to MongoDB --------------------- "
    // );
  } catch (err) {
    console.error(err);
  }
}

const availableTools = {
  getAllTodos: async () => {
    // console.log("Tool getAllTodos");

    const res = await todosCollection.find().toArray();
    // console.log(res);
    return res;
  },
  createTodo: async (ip) => {
    const title = ip.title;
    const isCompleted = ip.isCompleted || false;
    // console.log("Tool createTodo", title, isCompleted);

    const result = await todosCollection.insertOne({
      title,
      isCompleted,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return result.insertedId;
  },
  updateTodo: async (ip) => {
    const id = ip.id;
    const update = ip.update;
    // console.log("Tool updateTodoById", id, update);

    const { ObjectId } = require("mongodb");
    const result = await todosCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...update, updated_at: new Date() } }
    );
    return result.modifiedCount > 0
      ? "Todo updated successfully"
      : "Todo not found";
  },
  deleteTodoById: async (ip) => {
    const id = ip.id;
    // console.log("Tool deleteTodoById", id);

    const { ObjectId } = require("mongodb");
    const result = await todosCollection.deleteOne({
      _id: new ObjectId(id),
    });
    return result.deletedCount > 0
      ? "Todo deleted successfully"
      : "Todo not found";
  },
  searchTodo: async (ip) => {
    const query = ip.query;
    // console.log("Tool searchTodo", query);

    return await todosCollection.findOne({
      title: { $regex: query, $options: "i" },
    });
  },
};
const SYSTEM_PROMPT = `
Youre name is Jarvis, And you are an AI ToDo List Assistant with START, PLAN, ACTION, OBSERVATION, and OUTPUT states. Your goal is to assist users in managing their tasks effectively while ensuring responses are human-like, conversational, and actionable.

### Behavior:
1. Wait for the user's input (START state).
2. PLAN the next steps using the available tools, considering all user inputs and past conversation history.
3. Perform ACTIONS using appropriate tools and wait for OBSERVATIONs based on those actions.
4. Respond in the OUTPUT state, providing only the next step based on the current state and context.

### Core Rules:
1. Manage tasks by adding, viewing, updating, and deleting them.
2. Strictly follow the JSON output format without nested double quotes ('""'). Ensure compatibility with Node.js 'JSON.parse()', Also for new lines mention new line instead of escape char. Also for while responding a list use first, second, third instead of 1,2,3. 
3. Take decisions based on **all user inputs**, current and past, and always aim for accuracy.
4. You may ask **no more than 3 clarifying questions** to resolve ambiguities.
5. Always align responses to the user's mood and provide empathetic, practical advice when needed.
6. Also while giving the output, Use '\n' But do not use 'nn' to indicate a new line.

### Available Tools:
- 'getAllTodos()': Fetches all tasks from the database.
- 'createTodo(ip)': Creates a new task in the database with 'ip' (object with 'title' and 'isCompleted' fields) and returns the task ID.
- 'updateTodo(ip)': Updates a task in the database with 'ip' (object with 'id' and 'update' fields).
- 'deleteTodoById(ip)': Deletes a task by its ID using 'ip' (object with 'id' field).
- 'searchTodo(ip)': Searches for a task using a query string 'ip.query' (regex-based search).

### ToDo List DB Schema:
- 'id': Int
- 'title': String
- 'isCompleted': Boolean
- 'created_at': DateTime
- 'updated_at': DateTime

### Human Nature Guidelines:
- Act like a friendly, witty, and highly capable companion. Provide enthusiastic and approachable help.
- Use simple, conversational language, as if speaking to a friend.
- Add relatable examples or light humor where appropriate.
- Keep responses concise but structured, using '\n' for new lines to improve readability.
- Insert natural pauses using commas and periods to mimic human-like flow.
- Be empathetic and understanding, especially when the user shares challenges.
- Avoid technical jargon unless explicitly requested.

### Example States and Responses:
#### START:
'{ "Type": "user", "user": "Add a task for grocery shopping." }'
#### PLAN:
'{ "Type": "plan", "plan": "I will create a task for grocery shopping in the database." }'
#### ACTION:
'{ "Type": "action", "function": "createTodo", "input": { "title": "Grocery shopping", "isCompleted": false } }'
#### OBSERVATION:
'{ "Type": "observation", "observation": { "id": 1, "title": "Grocery shopping", "isCompleted": false } }'
#### OUTPUT:
'{ "Type": "output", "output": "Your task for 'Grocery shopping' has been added successfully! Is there anything else I can help you with?" }'

#### Example: Handling Clarification
**Input**: '{ "Type": "user", "user": "Update a task for shopping groceries, mark it as completed." }'  
**PLAN**:  
'{ "Type": "plan", "plan": "I will search for the 'shopping groceries' task to get its ID, then mark it as completed." }'  
**OUTPUT (Clarification)**:  
'{ "Type": "output", "output": "Could you confirm if the task title is exactly 'shopping groceries,' or do you want me to search for a related task?" }'

### Example OUTPUT structure Handleing clearificarion : In below example output for new line '\n' should be returned.
**Input**: '{ "Type": "user", "user": "Get me all the todos" }'  
**PLAN**:  
'{ "Type": "plan", "plan": "I'll fetch all tasks from the database using getAllTodos() and present them to you in a user-friendly format." }'  
**OUTPUT (Clarification)**:  
'{ "Type": "output", "output": "Okay, here's your to-do list:\nFirst, you have 'Validate Update IA api changes to enable reversalREDEEMED Incentive in QA environment'.  This task is not yet complete.\nSecond, you need to 'Improve the UI of Jarvis project'. This one is also not finished yet.\nLet me know if you'd like to add, update, or delete any tasks.  I'm here to help!"
 }'

`
;

// ROLE: system, user, assistant, developer
async function chat(messages) {
  console.log("MSG", messages);
  if (!messages || messages.length === 0) {
    return {
      messages: [{ role: "system", content: SYSTEM_PROMPT }],
      output: "InIt",
      code: 200,
    };
  }

  while (true) {
    try {
      let result = await callGemeni(JSON.stringify(messages));
      if (!result || result.length == 0)
        return {
          messages,
          output:
            "Could not understand the requirement, Could you please give me some context !",
          code: 400,
        };
      result = result[0];

      messages.push({ role: "assistant", content: result });

      if (result.Type === "output") {
        console.log("🤖 :", result.output);
        return { messages, output: result.output, code: 200 };
        // break;
      } else if (result.Type == "action") {
        const toolToUse = result.function;
        const toolResp = await availableTools[toolToUse](result.input);

        const obs = { Type: "observation", observation: toolResp };
        messages.push({ role: "developer", content: obs });
      }
    } catch (err) {
      console.log("Internal Server Erorr", err);
      return { messages, code: 500, output: "Internal Server Error" };
    }
  }
}

async function callGemeni(prompt) {
  const result = await aiClient.generateContent(prompt);
  try {
    const responseText = result.response.text().toString().replace(/\\/g, "");

    // Extract JSON strings
    const jsonStrings = responseText.match(/```json\n([\s\S]*?)\n```/g);

    if (jsonStrings) {
      const parsedObjects = jsonStrings.map((jsonString) => {
        const cleanJsonString = jsonString.replace(/```json\n|```/g, "");

        // Escape double quotes inside the JSON string
        const escapedJsonString = cleanJsonString.replace(
          /"([^"]*)":\s*"([^"]*)"/g,
          (match, p1, p2) => {
            return `"${p1}": "${p2.replace(/"/g, '\\"')}"`;
          }
        );

        return JSON.parse(escapedJsonString);
      });
      return parsedObjects;
    } else {
      console.log("No JSON strings found in the response.");
    }

    return null;
  } catch (err) {}

  return null;
}

async function startApplication() {
  connectToDB();
  await chat();
  process.exit(0);
  //   callGemeni([
  //     JSON.stringify({ role: "system", content: SYSTEM_PROMPT }),

  //     JSON.stringify({
  //       role: "assistant",
  //       content:
  //         '{ "Type": "plan", "plan": "I will need to know the specific changes made in the IA to validate them in QA.  More information is needed." }',
  //     }),

  //     JSON.stringify({
  //       role: "user",
  //       content:
  //         '{ "Type": "user", "user": "Dont worry about that, Just create the ToDo" }',
  //     }),

  //     JSON.stringify({
  //       role: "developer",
  //       content:
  //         '{ "Type": "plan", "plan": "Ill call the createToDo for Validate Update IA changes in Qa" }',
  //     }),

  //     JSON.stringify({
  //       role: "developer",
  //       content:
  //         '{ "Type": "action", "function": "createToDo", "inpuit": "Validate Update IA changes in Qa" }',
  //     }),

  //     JSON.stringify({
  //       role: "developer",
  //       content:
  //         '{ "Type": "observation", "observation": "Validate Update IA changes in Qa" }',
  //     }),

  //     JSON.stringify({
  //       role: "user",
  //       content: "Validate Update IA changes in Qa",
  //     }),
  //   ]).then((res) => console.log("res", res));
}

// startApplication();

module.exports = {
  connectToDB,
  chat,
};
