"use client";
import React from "react";
import ProtectedRoute from "./ProtectedRoute";

// --- SEU INTERCEPTADOR DE ERROS (Mantido e ativo) ---
if (typeof window !== "undefined") {
  const originalError = console.error;
  
  console.error = (...args) => {
    const isFirebasePermissionError = args.some(arg => {
      const message = arg?.message || (typeof arg === 'string' ? arg : "");
      const stack = arg?.stack || "";
      const code = arg?.code || "";
      
      return (
        message.includes("permission-denied") || 
        message.includes("insufficient permissions") ||
        code === "permission-denied" ||
        stack.includes("permission-denied")
      );
    });

    if (isFirebasePermissionError) {
      return; // Bloqueia o erro no console
    }

    originalError.apply(console, args);
  };
}

// --- LAYOUT COM PROTEÇÃO ---
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div style={{ width: "100%", minHeight: "100vh" }}>
        {children}
      </div>
    </ProtectedRoute>
  );
}