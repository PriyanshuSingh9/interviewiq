import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata = {
  title: "InterviewIQ | Agentic AI Mock Interviews",
  description: "Build your confidence with an AI agent that adapts, thinks, and interviews just like a real engineering manager.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${fraunces.variable} font-sans antialiased bg-mongodb-bg text-white selection:bg-mongodb-neon selection:text-mongodb-bg`}
      >
        {children}
      </body>
    </html>
  );
}
