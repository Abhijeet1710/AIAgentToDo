import React from "react";
import { TodolistIcon } from "./icons/todolistIcon";

const menuItems = [
    { id: 1, title: "ToDo 1", icon: <TodolistIcon /> },
    { id: 2, title: "ToDo 2", icon: <TodolistIcon /> },
    { id: 3, title: "ToDo 3", icon: <TodolistIcon /> },

  ];
  
  const AssistYouOptions = () => {
    return (
      <ul className="space-y-2 text-white w-60 text-gray-300">
        {menuItems.map((item) => (
          <li key={item.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-700">
            {item.icon} {/* Render the icon component */}
            <span>{item.title}</span> {/* Render the title */}
          </li>
        ))}
      </ul>
    );
  };
  
export default AssistYouOptions;
