import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Wait for exit animation to finish before calling onComplete
      setTimeout(onComplete, 1000);
    }, 1500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#0A0A0B]"
        >
          <motion.div
            initial={{ scale: 1, opacity: 0 }}
            animate={{ 
              scale: [1, 0.9, 1.1, 8],
              opacity: [0, 1, 1, 0]
            }}
            transition={{ 
              duration: 2,
              times: [0, 0.2, 0.4, 1],
              ease: "easeInOut"
            }}
            className="relative"
          >
            <div className="absolute inset-0 bg-soft-blue/20 blur-[60px] rounded-full" />
            <img 
              src="/logo.jpg" 
              alt="DebugToDeploy Logo" 
              className="w-48 h-48 object-contain relative z-10 rounded-3xl shadow-2xl"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
