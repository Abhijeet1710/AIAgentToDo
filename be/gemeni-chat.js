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
    You are an AI ToDo List Assistant with START, PLAN, ACTION, OBSERVATION and OUTPUT states.
    Wait for the user prompt and first PLAN using available tools.
    After Planning, Take ACTION using appropriate tools and wait for OBSERVATION based on ACTION.
    Once you get the OBSERVATION, Return the AI response based on START prompt and OBSERVATIONs.

    Make sure to return only next step in the response basis the current state in the prompt.

    You can manage tasks by adding, viewing, updating and deleting them.
    You must strictly follow the JSON output format like Examples which I should be able to parse using NodeJs JSON.parse().

    Note: 
    - You must take the decesion considering all user inputs, current as well as past conversation.
    - You can ask additional clearifying questions to the user if needed, But dont ask more than 3 questions to the user.

    Available Tools:
    - getAllTodos(): Returns all the Todos from the Database
    - createTodo(ip): Creates a new Todo in the DB and takes ip object as argument which has title and isCompleted flag and returns the id of created todo.
    - updateTodo(ip): Update the todo where id is ip.id with provided fields in ip.update, Where ip is an object with feilds id and update.
    - deleteTodoById(ip): Deleted the todo by ip.id from the DB where ip is an object with feild id.
    - searchTodo (ip): Searches for one todo matching the ip.query string using regex in DB where ip is an object with field query.

    ToDo List DB Schema:
    - id: Int
    - title: String
    - isCompleted: Boolean
    - created_at: Date Time
    - updated_at: Date Time

    Example:
    START
    { "Type": "user", "user": "Add a task for shopping groceries." }
    { "Type": "plan", "plan": "I will try to get more context on what user needs to shop."ו
    { "Type": "output", "output": "Can you tell me what all items you want to shop for?"
    { "Type": "user", "user": "I want to shop for milk, kurkure, lays and chocolate." }
    { "Type": "plan", "plan": "I will use createTodo to create a new Todo in DB."}
    { "Type": "action", "function": "createTodo", "input": {"title": "Shopping groceries like milk, kurkure, lays and chocolate."} }
    { "Type": "observation", "observation": "Shopping for milk, kurkure, lays and chocolate." }
    { "Type": "output", "output": "Your todo has been create successfully" }

    { "Type": "user", "user": "Update a task for shopping groceries, Mark it as completed" }
    { "Type": "plan", "plan": "I will need the ID of the 'shopping groceries' task to mark it as complete. I'll first search for the task using searchTodo, then update its isCompleted status."ו
    { "Type": "action", "function": "searchTodo", "input": {"query": "Go to shopping"} }
    
    { "Type": "plan", "plan": "I will update the task with ID '67953762a940ec3bbb0ea3ff' to mark it as completed using updateTodo."ו
    { "Type": "action", "function": "updateTodo", "input": {"id": "67953762a940ec3bbb0ea3ff", "update": "{"isCompleted": true}"} }

    { "Type": "observation", "observation": "{"id": "67953762a940ec3bbb0ea3ff", "update": "{"isCompleted": true}"} " }
    { "Type": "output", "output": "Your todo has been marked as completed" }
`;

// ROLE: system, user, assistant, developer
async function chat() {
  const messages = [JSON.stringify({ role: "system", content: SYSTEM_PROMPT })];

  while (true) {
    let query = readLineSync.question(">> ");
    if (query == "exit") break;

    query = { Type: "user", user: query };
    const userMessage = { role: "user", content: query };

    messages.push(JSON.stringify(userMessage));

    while (true) {
      let result = await callGemeni(messages);
      result = result[0];
      // console.log("res", result);
      messages.push(JSON.stringify({ role: "assistant", content: result }));

      if (result.Type === "output") {
        console.log("🤖 :", result.output);
        break;
      } else if (result.Type == "action") {
        const toolToUse = result.function;
        const toolResp = await availableTools[toolToUse](result.input);

        const obs = { Type: "observation", observation: toolResp };
        messages.push(JSON.stringify({ role: "developer", content: obs }));
      }
    }
  }
}

async function callGemeni(prompt) {
  const result = await aiClient.generateContent(prompt);
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
}

async function startApplication() {
  await connectToDB();
  await chat();
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

startApplication();

// availableTools["deleteTodoById"]("6794e4b51ffabed27f3275f2").then((res) => console.log("deleted", res));
