import React, { useState, useEffect, useRef } from "react";
import { Loader, Mic, MicOff } from "lucide-react";
import axios from "axios";
import AnimatedGradientCircle from "./AnimatedGradientCircle";
import { TodolistIcon } from "./icons/todolistIcon";
import AssistYouOptions from "./AssistYouOptions";

let messages = [];
let preferredVoice;

const synth = window.speechSynthesis;
let availableVoices = [];

async function loadVoices() {
  availableVoices = synth.getVoices();
  if (availableVoices.length > 0) {
  } else {
    console.warn("No voices available. Check your browser or try again.");
  }
}

synth.onvoiceschanged = () => {
  loadVoices();
};

const SpeechDetectionScreen = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState("dashboard");
  const inputRef = useRef(null);

  async function assistantResponse(content) {
    synth.cancel();
    // await new Promise(() => setTimeout(() => {}, 500));
    // content = content.replace(/nn/g, '\n').replace(/\\n/g, '\n');
    content = content.replace(/nn(?=\s|[.,!?;:]|\b|$)/g, "\n");
    const sentences = content
      .split(/[\.!?;:\\(\)\[\]\{\}…\n\r]+/)
      .map((part) => {
        if (part.indexOf("nn") == 0) {
          part = part.substring(2);
        }
        return part.trim();
      })
      .filter(Boolean);
    //  console.log("All Sentences", sentences);

    let currentSentence = 0;

    function speakNext() {
      if (currentSentence < sentences.length) {
        const utterance = new SpeechSynthesisUtterance(
          sentences[currentSentence]
        );

        // Set voice and properties
        utterance.voice =
          availableVoices.find((voice) =>
            voice.name.includes("Google US English")
          ) || availableVoices[0];
        utterance.pitch = 1;
        utterance.rate = 1;
        utterance.volume = 1;

        // Event listeners
        utterance.onend = () => {
          currentSentence++;
          speakNext();
        };
        utterance.onerror = (e) => console.error("Speech synthesis error:", e);

        // Speak the current sentence
        synth.speak(utterance);
      } else {
        // console.log("All sentences spoken.");
      }
    }

    speakNext();
  }

  async function callLLM() {
    // setLoading(true);
    const isInIt = messages.length == 0;

    if (!isInIt) {
      if (transcript.trim() == "") {
        return;
      }
      const userPrompt = {
        role: "user",
        content: {
          Type: "user",
          user: transcript,
        },
      };

      messages.push(userPrompt);
    }

    console.log("Calling LLM", messages);

    try {
      const resp = await axios.post("http://localhost:3000/api/v1/chat", {
        messages: messages.length ? messages : undefined,
        userName: "Abhijeet",
      });

      console.log("🤓 : ", resp.data);
      if (!isInIt && resp.data.output) {
        // Speak the output to the user
        await assistantResponse(resp.data.output);

        // alert(resp.data.output);
      }

      messages = resp.data.messages;
    } catch (error) {
      console.error("Error calling LLM:", error);
    }

    // setLoading(false);
  }

  async function init() {
    setLoading(true);

    await callLLM();
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
    await new Promise((resolve, _) =>
      setTimeout(() => {
        resolve();
      }, 500)
    );
    console.log("fal");

    setLoading(false);
  }

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.scrollLeft = inputRef.current.scrollWidth;
    }
  }, [transcript]);

const toggleRecording = () => {
    console.log("inside toggleRec");
    
    if (!recognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (isRecording) {
      recognition.stop();
      callLLM();
      setIsRecording(false);
    } else {
      setScreen("chat");
      recognition.start();
      setIsRecording(true);
    }
};

  const handleInputChange = (event) => {
    setTranscript(event.target.value);
  };

  if (loading)
    return (
      <div className="bg-black">
        <AnimatedGradientCircle />
      </div>
    );

  if (screen === "dashboard") {
    return (
      <div className="w-screen h-screen overflow-hidden bg-black text-white py-4 px-4">
        <div className="">
          <div className="">
            <h2 className="text-3xl font-semibold text-center">Jarvis</h2>
          </div>
        </div>
        {!isRecording && (
          <div className="mt-8 h-screen">
            <div className="text-xl  font-semibold">
              <h2>How can I assist you? </h2>
            </div>

            <div>
              <AssistYouOptions />
            </div>

            <div className="absolute bottom-0 w-full flex justify-center p-4">
              <button className="text-black" onClick={() => toggleRecording()}>
                Chat with me
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (screen === "chat") {
    return (
      <div className="w-screen h-screen overflow-hidden bg-black text-white py-4 px-4">
        <div className="">
          <div className="">
            <h2 className="text-3xl font-semibold text-center">Jarvis</h2>
          </div>
        </div>

        {isRecording && (
          <div className="mt-8 h-screen">
            <div>
              <input
                ref={inputRef}
                value={transcript}
                onChange={handleInputChange}
                className="border-none flex-1 h-16 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="">
              <AnimatedGradientCircle clickFunc={toggleRecording} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-black text-white">
      <div className="h-[80%] overflow-y-scroll">
        <h2 className="text-3xl font-semibold text-center">Some Error</h2>
      </div>
    </div>
  );
};

export default SpeechDetectionScreen;
