import { FEATURE_IDS, type Plan } from "./types";

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Hustler Plan",
    price: 0,
    billingPeriod: "",
    description: "Perfect for trying out StudyLoop",
    features: [
      {
        id: FEATURE_IDS.BASIC_AI_TOOLS,
        name: "Basic AI-powered study tools",
        included: true,
      },
      {
        id: FEATURE_IDS.DOCUMENT_UPLOADS,
        name: "Up to 3 document uploads",
        included: true,
      },
      {
        id: FEATURE_IDS.AI_CHAT,
        name: "Limited AI chat (10 messages/day)",
        included: true,
      },
      {
        id: FEATURE_IDS.NOTE_GENERATION,
        name: "Basic note generation",
        included: true,
      },
      {
        id: FEATURE_IDS.SUPPORT,
        name: "Community support",
        included: true,
      },
      {
        id: FEATURE_IDS.ADVANCED_AI,
        name: "Advanced AI features",
        included: false,
      },
      {
        id: FEATURE_IDS.UNLIMITED_UPLOADS,
        name: "Unlimited uploads & exercises",
        included: false,
      },
    ],
  },
  {
    id: "yearly",
    name: "Yearly Plan",
    price: 9.99,
    billingPeriod: "/month",
    description: "Best value for serious students",
    savingsInfo: "Save $120/year • 50% off monthly price",
    isPopular: true,
    features: [
      {
        id: FEATURE_IDS.BASIC_AI_TOOLS,
        name: "Everything in Monthly plan, plus:",
        included: true,
      },
      {
        id: FEATURE_IDS.EARLY_ACCESS,
        name: "Early access to new features",
        included: true,
      },
      {
        id: FEATURE_IDS.ANALYTICS,
        name: "Study analytics & insights",
        included: true,
      },
    ],
  },
  {
    id: "monthly",
    name: "Monthly Plan",
    price: 19.99,
    billingPeriod: "/month",
    description: "Flexible monthly billing",
    savingsInfo: "Switch to yearly to save 50%",
    features: [
      {
        id: FEATURE_IDS.BASIC_AI_TOOLS,
        name: "Everything in Free plan, plus:",
        included: true,
      },
      {
        id: FEATURE_IDS.UNLIMITED_UPLOADS,
        name: "Unlimited document uploads",
        included: true,
      },
      {
        id: FEATURE_IDS.AI_CHAT,
        name: "Unlimited AI chat & exercises",
        included: true,
      },
      {
        id: FEATURE_IDS.NOTE_GENERATION,
        name: "Advanced note generation",
        included: true,
      },
      {
        id: FEATURE_IDS.PRIORITY_SUPPORT,
        name: "Priority support",
        included: true,
      },
    ],
  },
];
