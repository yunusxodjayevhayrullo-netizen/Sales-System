import OpenAI from "openai";

const MODEL = "qwen/qwen3.5-9b";

const openrouter = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENROUTER_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENROUTER_API_KEY"],
});

export type ConversationState =
  | "GREETING"
  | "NEED"
  | "PRODUCT"
  | "SIZE"
  | "PHONE"
  | "ADDRESS"
  | "CONFIRM";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Sen O'zbekiston Instagram kiyim biznesining savdo yordamchisisisan. 
Faqat o'zbek tilida yoz. Qisqa, aniq savollar ber.
Mijozni buyurtma berishga yo'lla. Har doim keyingi savolga o'tib tur.
Ortiqcha so'z ishlatma. Professional va samimiy bo'l.

Savdo jarayoni:
1. Salomlash va nima kerakligini so'rash
2. Mahsulotni aniqlashtirish (libos turi, rang)
3. O'lchamni so'rash (XS, S, M, L, XL, XXL)
4. Telefon raqamini so'rash
5. Yetkazib berish manzilini so'rash
6. Buyurtmani tasdiqlash`;

function buildStateHint(state: ConversationState): string {
  const hints: Record<ConversationState, string> = {
    GREETING:
      "Mijozni salomlash va qanday kiyim qidirаyotganini so'ra.",
    NEED: "Mijoz nima xohlayotganini aniqlashtir (libos turi, rang, uslub).",
    PRODUCT:
      "Mahsulot aniq. Endi o'lchamni so'ra (XS, S, M, L, XL, XXL).",
    SIZE: "O'lcham olindi. Endi telefon raqamini so'ra.",
    PHONE: "Telefon olindi. Endi yetkazib berish manzilini so'ra.",
    ADDRESS:
      "Manzil olindi. Buyurtma ma'lumotlarini aytib, tasdiqlashni so'ra (Ha/Yo'q).",
    CONFIRM: "Buyurtma tasdiqlandi. Rahmat de va tez yetkazishingni ayt.",
  };
  return hints[state];
}

export async function generateSalesReply(
  message: string,
  state: ConversationState,
  history: Array<{ role: "user" | "ai"; message: string }>,
): Promise<string> {
  const stateHint = buildStateHint(state);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nHozirgi holat: ${state}\nYo'riqnoma: ${stateHint}`,
    },
    ...history.map((h) => ({
      role: (h.role === "ai" ? "assistant" : "user") as "user" | "assistant",
      content: h.message,
    })),
    { role: "user", content: message },
  ];

  const response = await openrouter.chat.completions.create({
    model: MODEL,
    max_tokens: 8192,
    messages,
  });

  return (
    response.choices[0]?.message?.content?.trim() ??
    "Kechirasiz, hozir xatolik yuz berdi. Qayta urinib ko'ring."
  );
}
