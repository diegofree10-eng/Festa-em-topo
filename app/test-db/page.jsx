"use client";

import { db } from "@/lib/firebase";

export default function TestDB() {

  console.log("🔥 DB OBJ:", db);

  return (
    <div>
      <h1>TEST DB</h1>
      <p>Olha o console (F12)</p>
    </div>
  );
}