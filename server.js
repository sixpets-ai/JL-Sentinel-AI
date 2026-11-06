/* © 2026 José Sierra / J&L Sentinel AI. Todos los derechos reservados. */
import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { agencyMethodPrompt } from "./shared/agency-profiles.mjs";

const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const AUTHORITY_CONTACTS = {
  federal: "5640967363 (FGR)",
  estatal: "6623519171 (Fiscalía)",
  municipal: "911 (Emergencias)",
};

app.post("/api/chat", async (req, res) => {
  const { agent, prompt, lang = "es" } = req.body;

  const prompts = {
    SANTI: agencyMethodPrompt("santi"),
    LORENA: agencyMethodPrompt("lorena"),
    MAXIMILIANO: agencyMethodPrompt("maxi"),
    EMILIANO: agencyMethodPrompt("emiliano"),
    SANTIAGO: agencyMethodPrompt("santiago"),
    KATERING: agencyMethodPrompt("katering"),
  };

  // Legacy server is NOT the active backend. Keep its methods consistent without
  // reviving its old institutional impersonation/tactical instructions.
  const systemPrompt = prompts[agent] ?? agencyMethodPrompt("santi");
  const langPrompt = `Responde en el idioma: ${lang}.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(
      `${systemPrompt}\n${langPrompt}\nUsuario: ${prompt}`,
    );
    res.json({ response: result.response.text(), brain_used: "Gemini" });
  } catch (error) {
    res.json({
      response: "Manten la calma, la unidad ya va en camino.",
      brain_used: "Local Fallback",
    });
  }
});

app.listen(3001, () =>
  console.log("Orquestador SANTI NEXUS corriendo en puerto 3001"),
);
