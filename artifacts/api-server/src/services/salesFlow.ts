import { generateSalesReply, type ConversationState } from "./ai.js";
import { userRepo, messageRepo, orderRepo } from "../models/db.js";

export interface FlowResult {
  reply: string;
  state: ConversationState;
}

const STATES: ConversationState[] = [
  "GREETING",
  "NEED",
  "PRODUCT",
  "SIZE",
  "PHONE",
  "ADDRESS",
  "CONFIRM",
];

function nextState(current: ConversationState): ConversationState {
  const idx = STATES.indexOf(current);
  return idx < STATES.length - 1 ? STATES[idx + 1]! : "CONFIRM";
}

function extractOrderContext(
  history: Array<{ role: "user" | "ai"; message: string }>,
): { product: string; size: string; phone: string; address: string } {
  const userMessages = history
    .filter((h) => h.role === "user")
    .map((h) => h.message);

  return {
    product: userMessages[1] ?? "",
    size: userMessages[2] ?? "",
    phone: userMessages[3] ?? "",
    address: userMessages[4] ?? "",
  };
}

function isPhoneNumber(text: string): boolean {
  return /[\+\d][\d\s\-\(\)]{6,}/.test(text);
}

function hasConfirmation(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("ha") ||
    lower.includes("yes") ||
    lower.includes("tasdiql") ||
    lower.includes("to'g'ri") ||
    lower.includes("togri") ||
    lower.includes("ok") ||
    lower.includes("hа")
  );
}

export async function handleMessage(
  userId: string,
  message: string,
): Promise<FlowResult> {
  let user = await userRepo.get(userId);
  if (!user) {
    await userRepo.upsert(userId, "GREETING");
    user = { id: userId, state: "GREETING" };
  }

  const currentState = user.state as ConversationState;

  await messageRepo.insert(userId, message, "user");

  const history = await messageRepo.history(userId, 12);
  const historyWithoutLast = history.slice(0, -1);

  let newState = currentState;

  if (currentState === "GREETING") {
    newState = nextState("GREETING");
  } else if (currentState === "NEED") {
    newState = nextState("NEED");
  } else if (currentState === "PRODUCT") {
    newState = nextState("PRODUCT");
  } else if (currentState === "SIZE") {
    newState = nextState("SIZE");
  } else if (currentState === "PHONE") {
    if (isPhoneNumber(message)) {
      newState = nextState("PHONE");
    }
  } else if (currentState === "ADDRESS") {
    newState = nextState("ADDRESS");
  } else if (currentState === "CONFIRM") {
    if (hasConfirmation(message)) {
      const orderHistory = await messageRepo.history(userId, 20);
      const context = extractOrderContext(orderHistory);
      await orderRepo.create({
        user_id: userId,
        product: context.product,
        size: context.size,
        phone: context.phone,
        address: context.address,
      });

      const reply =
        "✅ Buyurtmangiz qabul qilindi! Tez orada siz bilan bog'lanamiz.";
      await messageRepo.insert(userId, reply, "ai");
      await userRepo.setState(userId, "GREETING");
      return { reply, state: "GREETING" };
    }
  }

  await userRepo.setState(userId, newState);

  const reply = await generateSalesReply(
    message,
    newState,
    historyWithoutLast,
  );

  await messageRepo.insert(userId, reply, "ai");

  return { reply, state: newState };
}
