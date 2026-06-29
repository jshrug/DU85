import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  const { content } = req.body || {};
  if (!content) return res.status(400).json({ error: "No PDF content provided." });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: content },
            },
            {
              type: "text",
              text: "Extract the full text content of this document verbatim. Return only the extracted text with no preamble, commentary, or added formatting.",
            },
          ],
        },
      ],
    });

    const text = message.content[0]?.text || "";
    res.status(200).json({ text });
  } catch (err) {
    res.status(500).json({ error: err.message || "PDF extraction failed." });
  }
}
