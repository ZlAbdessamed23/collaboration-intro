"use client"

import dynamic from "next/dynamic";
import Editor from "./Editor";
const DrawingApp = dynamic(() => import("@/app/DrawingApp"));

export default function Home() {



  return (
    <div>
      <Editor />
    </div>
  );
};
