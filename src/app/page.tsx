"use client"

import dynamic from "next/dynamic";
import Editor from "./Editor";
const DrawingApp = dynamic(() => import("@/app/DrawingApp"));
import WordFileProcessor from "./WordProcessor";
import ExcelProcessor from "./ExcelProcessor";


export default function Home() {

  return (
    <div>
      <DrawingApp />
    </div>
  );
};
