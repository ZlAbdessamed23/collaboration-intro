"use client"

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const DrawingApp = dynamic(() => import("@/app/DrawingApp"));

export default function Home() {
  // const [mounted , setMounted] = useState(false);

  // useEffect(() => {
  //   setMounted(true);
  // },[]);

  // if(!mounted){
  //   return <div>Loading...</div>
  // };


  return (
    <div>
      <DrawingApp />
    </div>
  );
};
