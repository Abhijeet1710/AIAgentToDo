require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { MongoClient } = require("mongodb");
const readLineSync = require("readline-sync");

const { SYSTEM_PROMPT } = require("./utils/constants.js");

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

// ROLE: system, user, assistant, developer
async function chat(messages) {
  if (!messages || messages.length === 0) {
    return {
      messages: [{ role: "system", content: SYSTEM_PROMPT }],
      output: "InIt",
      code: 200,
    };
  }
  console.log("MSG", messages[messages.length - 1]);

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
