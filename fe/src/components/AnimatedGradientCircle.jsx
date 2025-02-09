import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

const AnimatedGradientCircle = ({clickFunc}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 3.0; // Start fast (2x)
    }
  }, []);

  return (
    <div className="flex justify-center items-center h-screen">
      <video
        ref={videoRef} 
        width="600"
        onClick={clickFunc}
        autoPlay
        loop
        muted
        playsInline // Ensures it plays automatically on mobile
        className="z-100 rounded-lg"
      >
        <source src="/original-1.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* <div className="z-1 absolute top-0 left-0 w-full h-full bg-yellow-100"></div> */}

    </div>
  );
};

export default AnimatedGradientCircle;
