import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import SpeechDetectionScreen from "./components/SpeechDetectionScreen";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <SpeechDetectionScreen />
    </div>
  );
}

export default App;
