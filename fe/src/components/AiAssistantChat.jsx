import React from "react";

const AiAssistantChat = () => {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-100 text-gray-800">
      <div className="text-center">
        <div className="text-start">
          <h2 className="text-4xl font-bold mb-4">
            Hi there, <span className="text-purple-600">John</span>
          </h2>
          <h2 className="text-4xl font-bold mb-4">
            I'm your AI ToDo Assistant,{" "}
            <span className="text-purple-600">
              What would you want me to do?
            </span>
          </h2>
        </div>
      </div>
      <div className="w-full max-w-3xl mt-12 bg-white shadow-lg rounded-lg p-6 flex items-center">
        <input
          className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
          type="text"
          placeholder="Ask whatever you want..."
        />
        <button className="ml-4 bg-purple-600 text-white p-3 rounded-lg shadow hover:bg-purple-700">
          All Web
        </button>
      </div>
    </div>
  );
};

export default AiAssistantChat;
