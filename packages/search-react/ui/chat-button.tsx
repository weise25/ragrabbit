"use client";
import React, { useState } from "react";
import RagRabbitModal from "./modal.js";

export interface RagRabbitChatButtonProps {
  buttonText?: string;
  domain: string;
}

export default function RagRabbitChatButton({ buttonText = "Chat", domain }: RagRabbitChatButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: "60px",
          height: "60px",
          fontSize: "24px",
          cursor: "pointer",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background-color 0.3s, transform 0.3s",
        }}
      >
        {buttonText}
      </button>
      <RagRabbitModal open={isOpen} onOpenChange={setIsOpen} position="right" domain={domain} />
    </>
  );
}
