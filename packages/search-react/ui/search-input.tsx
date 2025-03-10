"use client";
import React, { useState, useRef } from "react";
import RagRabbitModal from "./modal.js";

export interface RagRabbitSearchInputProps {
  placeholder?: string;
  domain: string;
}

export default function RagRabbitSearchInput({ placeholder = "Search...", domain }: RagRabbitSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  return (
    <>
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          margin: "0 auto",
          position: "relative",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "16px",
            outline: "none",
            transition: "border-color 0.3s",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
          }}
          placeholder={placeholder}
          onFocus={handleFocus}
          onClick={handleFocus}
        />
      </div>
      <RagRabbitModal open={isOpen} onOpenChange={setIsOpen} position="centered" domain={domain} />
    </>
  );
}
