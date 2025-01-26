import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";

const SpeechDetectionScreen = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Check for browser support and initialize SpeechRecognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "en-GB";

      recognitionInstance.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            // setTranscript((prev) => `${prev} ${result[0].transcript}`);
            interimTranscript = `${transcript} ${result[0].transcript}`;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        console.log(interimTranscript);
        setTranscript(interimTranscript); // Only the latest result
      };

      recognitionInstance.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      setRecognition(recognitionInstance);
    } else {
      console.warn("SpeechRecognition is not supported in this browser.");
    }
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.scrollLeft = inputRef.current.scrollWidth;
    }
  }, [transcript]);

  const toggleRecording = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleInputChange = (event) => {
    setTranscript(event.target.value);
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-gray-100 py-4">
      <div className="h-[80%] overflow-y-scroll">
        <h1 className="text-4xl font-bold text-center">Jarvis</h1>
      </div>
      <div className="flex flex-col justify-end items-center p-4 overflow-hidden">
        <div className="flex items-center gap-4 w-full max-w-4xl">
          <input
            ref={inputRef}
            value={transcript}
            onChange={handleInputChange}
            placeholder="Your speech will appear here..."
            className="flex-1 h-16 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            onClick={toggleRecording}
            className={`
              px-4 py-4
            relative flex items-center justify-center w-16 h-16 rounded-full shadow-lg
            transition-transform transform hover:scale-120 focus:outline-none
            bg-gray-100
          `}
          >
            {/* Animated ring when recording */}
            {isRecording && (
              <span
                className="
                absolute inset-0 animate-ping rounded-full
                bg-red-500 opacity-75
              "
              ></span>
            )}

            {isRecording ? (
              <MicOff className="text-blue w-8 h-8 z-10" />
            ) : (
              <Mic className="text-blue w-8 h-8 z-10" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpeechDetectionScreen;
