"use client";

import { useState, useEffect, useRef } from "react";

interface BarcodeScannerOptions {
  enabled?: boolean;
  onScan: (barcode: string) => void;
  playSoundOnScan?: boolean;
}

export function useBarcodeScanner({
  enabled = true,
  onScan,
  playSoundOnScan = true,
}: BarcodeScannerOptions) {
  const [isScanning, setIsScanning] = useState(false);
  const bufferRef = useRef<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastKeypressRef = useRef<number>(0);

  useEffect(() => {
    // If not enabled, don't set up listeners
    if (!enabled) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeDiff = now - lastKeypressRef.current;

      // If more than 100ms between keypresses, reset buffer
      if (timeDiff > 100) {
        bufferRef.current = "";
      }

      lastKeypressRef.current = now;

      // Ignore if typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Enter key signals end of barcode
      if (e.key === "Enter") {
        if (bufferRef.current.length > 0) {
          setIsScanning(true);
          
          // Play sound if enabled
          if (playSoundOnScan) {
            try {
              const audio = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZizcIG2m98OScTgwPUKfk77RgGwU7k9nyyHgpBSd+zPLaizsKGGS26+yjVhYLTKXi8bdfHAU0iM/z2Y4+CA==");
              audio.volume = 0.3;
              audio.play();
            } catch (err) {
              console.log("Could not play scan sound");
            }
          }

          // Trigger callback
          onScan(bufferRef.current);

          // Reset
          bufferRef.current = "";

          // Reset scanning indicator after short delay
          setTimeout(() => setIsScanning(false), 200);
        }
      } else if (e.key.length === 1) {
        // Add character to buffer
        bufferRef.current += e.key;
      }
    };

    // Add event listener
    window.addEventListener("keypress", handleKeyPress);

    // Cleanup
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, onScan, playSoundOnScan]); // All dependencies included

  return { isScanning };
}