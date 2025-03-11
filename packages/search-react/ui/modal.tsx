"use client";
import React, { useState, useEffect, Fragment, JSX } from "react";
import { createPortal } from "react-dom";

export interface RagRabbitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domain: string;
  position?: "centered" | "right";
}

export default function RagRabbitModal({
  open,
  onOpenChange,
  position = "centered",
  domain,
}: RagRabbitModalProps): JSX.Element | null {
  const [isMounted, setIsMounted] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    // Use a custom container appended to body to ensure it works in all environments
    if (typeof document !== "undefined" && !portalContainer) {
      // Check if container already exists
      let container = document.getElementById("rag-rabbit-modal-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "rag-rabbit-modal-container";
        container.style.position = "fixed";
        container.style.top = "0";
        container.style.left = "0";
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.zIndex = "9999";
        container.style.pointerEvents = "none"; // Pass through events when modal is closed
        document.body.appendChild(container);
      }
      setPortalContainer(container);
    }

    // Update container interactivity based on modal state
    if (portalContainer) {
      portalContainer.style.pointerEvents = open ? "auto" : "none";
    }
  }, [open, isMounted, portalContainer]);

  if (!isMounted) return null;
  if (!open) return null;
  if (typeof document === "undefined") return null;
  if (!portalContainer) return null;

  // Position-specific styles
  const baseStyles = {
    background: "white",
    padding: "20px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
    overflow: "hidden",
  };

  const contentStyle =
    position === "right"
      ? {
          ...baseStyles,
          position: "fixed" as const,
          bottom: "100px",
          right: "20px",
          width: "600px",
          height: "70%",
          maxHeight: "90%",
          maxWidth: "90%",
        }
      : {
          ...baseStyles,
          position: "relative" as const,
          width: "90%",
          maxWidth: "800px",
          height: "80%",
          maxHeight: "600px",
          display: "flex",
          flexDirection: "column" as const,
          justifyContent: "center",
          alignItems: "center",
        };

  const modalContent = (
    <div
      onClick={() => onOpenChange(false)}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={contentStyle}>
        <button
          onClick={() => onOpenChange(false)}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "none",
            border: "none",
            fontSize: "24px",
            cursor: "pointer",
          }}
        >
          &times;
        </button>
        <iframe
          src={`${domain}widget/chat`}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
        />
      </div>
    </div>
  );

  // Render the modal into our custom container
  return <Fragment>{createPortal(modalContent, portalContainer)}</Fragment>;
}
