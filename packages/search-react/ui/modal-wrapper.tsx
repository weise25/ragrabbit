"use client";
import React from "react";
import RagRabbitModal, { RagRabbitModalProps } from "./modal";

// This wrapper component ensures type compatibility with NextJS client components
export default function RagRabbitModalWrapper(props: RagRabbitModalProps): JSX.Element {
  // Use a wrapper div to ensure we return a proper JSX.Element
  return (
    <>
      <RagRabbitModal {...props} />
    </>
  );
}
