"use client"

import dynamic from "next/dynamic";
import Editor from "./Editor";
const DrawingApp = dynamic(() => import("@/app/DrawingApp") , {ssr : false});
const ZoomableCanvas = dynamic(() => import("@/app/ZoomableCanvas") , {ssr : false});
const CombinedCanvas = dynamic(() => import("@/app/CombinedCanvas") , {ssr : false});
const Mermaid = dynamic(() => import("@/app/Mermaid"));
import WordFileProcessor from "./WordProcessor";
import ExcelProcessor from "./ExcelProcessor";
import ZoomTester from "./PanExample";
import PanExample from "./PanExample";
import ZoomPanExample from "./ZoomPanExample";



export default function Home() {

  return (
    <DrawingApp />
  );
};
