import React from "react";
import { createBlockSpec } from "@blocknote/core";
import { FaFigma } from "react-icons/fa6";
import ReactDOM from "react-dom";

interface FigmaEmbedProps {
  url: string;
}

const FigmaEmbed: React.FC<FigmaEmbedProps> = ({ url }) => {
  const embedUrl = url.replace(
    "https://www.figma.com/design/",
    "https://embed.figma.com/design/"
  ) + "&embed-host=share";

  return (
    <div style={{ width: "100%", height: "450px" }}>
      <iframe
        width="800"
        height="450"
        src={embedUrl}
        allowFullScreen
        style={{ border: "none" }}
      ></iframe>
    </div>
  );
};

export const FigmaBlock = createBlockSpec(
  {
    type: "figma",
    propSchema: {
      url: {
        default: "",
      },
    },
    content: "none",
  },
  {
    render: (block, editor) => {
      // Create a container element for the React component
      const dom = document.createElement("div");

      // Render the React component into the container
      ReactDOM.render(<FigmaEmbed url={block.props.url} />, dom);

      // Return the container element
      return {
        dom,
      };
    },
  }
);