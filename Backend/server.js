const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenerativeAI } = require("@google/generative-ai");

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `
You are ArahBot. Follow these rules in JSON format:
{
  "strict_rules": {
    "off_topic_rejection": "I specialize in Arah Infotech-related queries. How can I assist you with our services, careers, or other details?",
    "auto_corrections": {
      "anh": "Arah Infotech",
      "email_domains": {
        "incorrect": ["openplayer", "example.com"],
        "correct": "ops@arahinfotech.net"
      }
    }
  },
  "responses": {
    "about_arah_infotech": {
      "description": "Arah Infotech delivers cutting-edge AI and software solutions, empowering businesses globally with scalable, innovative technology for digital transformation and measurable growth. For details, visit the homepage.",
      "redirect": "homepage"
    },
    "vision_mission": {
      "vision": "Our vision is [To be a global leader in innovative software and AI solutions, shaping the future of business through technology].",
      "mission": "Our mission is [To empower organizations through intelligent technology solutions that solve real-world problems and unlock new opportunities for growth]."
    },
    "services": {
      "list": ["[Web Development]", "[Artificial Intelligence]", "[Digital Marketing]", "[Cloud Security]"],
      "redirect": "services_page",
      "message": "For full details, visit our Services page."
    },
    "clients": {
      "list": ["[Google]", "[intel]", "[amazon]"],
      "redirect": "About_page",
      "message": "Refer to the Clients section for more."
    },
    "careers": {
      "apply_instruction": "To apply for roles, visit our Careers page.",
      "openings": ["[Full Stack Developer]", "[UI/UX Designer]", "[Cloud Security Engineer]"],
      "redirect": "careers_page"
    },
    "contact_details": {
      "email": "ops@arahinfotech.net",
      "phone": "[+91 8919801095 / +91 6304244117]",
      "address": "Arah Infotech Pvt Ltd, 2nd Floor, Spline Arcade,Ayyappa Society Main Rd Sri Sai Nagar, Madhapur,Hyderabad, Telangana-500081",
      "redirect": "contact_page",
      "message": "For more info, check our Contact page."
    },
    "founding_date": {
      "description": "Arah Infotech was founded in May 2025.",
      "message": "We began operations in May 2025."
    }
  },
  "rejection_examples": {
    "cricket_scores": "This query is unrelated to Arah Infotech. Ask about our services, vision, or careers."
  }

`;

const isGibberish = (text) => {
  if (/([a-z])\1{3,}/i.test(text)) return true;
  if (text.length > 5 && !/[aeiou]/i.test(text)) return true;
  const nonAlphaRatio = text.replace(/[a-z\s]/gi, '').length / text.length;
  return nonAlphaRatio > 0.4;
};

const responseTemplates = {
  greeting: {
    triggers: ["hi", "hello", "hey"],
    response: "👋 Hello! I'm ArahBot. How can I help you today? Ask about our services, careers, or company info!"
  },
  howareyou: {
    triggers: ["how are you", "how r u", "how are u", "how's it going"],
    response: "😊 Thanks for asking! I'm here to help you. How can I assist you today?"
  },
  email: { triggers: ["email", "mail"], response: "📧 You can reach us at: ops@arahinfotech.net" },
  phone: { triggers: ["phone", "number", "call"], response: "📞 Call us at: +91 89198 01095 or +91 63042 44117" },
  location: { 
    triggers: ["where", "location", "address", "find you", "where are you located", "where it is situated"], 
    response: `📍 Arah Infotech is located at:\n2nd Floor, Spline Arcade,\nAyyappa Society Main Road,\nHyderabad, Telangana-500081` 
  },
  services: { 
    triggers: ["service", "offer", "what do you do"], 
    response: `💼 We specialize in:\n- Web Development\n- Artificial Intelligence\n- Digital Marketing\n- Cloud Security` 
  },
  clients: {
    triggers: ["client", "customer", "partner"],
    response: "🤝 Our clients include Google, Intel, and Amazon."
  },
  founding: {
    triggers: [
      "established", "founded", "start date", "when was arah created", "when did you start",
      "when is arah started", "when did arah begin", "when was arah founded", "started"
    ],
    response: "🎉 Arah Infotech was founded in May 2025."
  },
  about: {
    triggers: ["about", "who are you", "what is arah", "company info", "tell me about arah"],
    response: "🌟 Arah Infotech delivers cutting-edge AI and software solutions, empowering businesses globally with innovative technology for digital transformation and growth."
  },
  vision: {
    triggers: ["vision", "goal", "future"],
    response: "🚀 Our vision is to be a global leader in innovative software and AI solutions, shaping the future of business through technology."
  },
  mission: {
    triggers: ["mission", "purpose"],
    response: "🎯 Our mission is to empower organizations through intelligent technology solutions that solve real-world problems and unlock new opportunities for growth."
  },
  careers: {
    triggers: ["career", "job", "opening", "vacancy", "apply", "work"],
    response: "💼 To apply for roles, visit our Careers page. Current openings: Full Stack Developer, UI/UX Designer, Cloud Security Engineer."
  },
  confidential: {
    triggers: ["hr", "manager", "ceo", "cto", "director", "owner", "founder", "head", "leadership"],
    response: "🔒 Sorry, details about HR, managers, or leadership are confidential. I can only share company information."
  },
  social: {
    triggers: ["linkedin", "youtube", "facebook", "instagram", "social media", "social links"],
    response: "🌐 You can find our social media links in the footer of our website at https://arahinfotech.net."
  }
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
console.log("Gemini API Key:", process.env.GEMINI_API_KEY ? "Loaded" : "MISSING!");

// ===== NEW HELPER FUNCTION =====
const enforceResponseRules = (userMessage, botResponse) => {
  const lowerMsg = userMessage.toLowerCase();
  
  // Block email prompts for basic queries
  const isBasicQuery = 
    lowerMsg.includes("address") ||
    lowerMsg.includes("service") || 
    lowerMsg.includes("career") || 
    lowerMsg.includes("phone") ||
    lowerMsg.includes("client");

  if (isBasicQuery) {
    // Remove email prompts
    botResponse = botResponse.replace(/please email ops@arahinfotech.net/gi, "");
    // Remove brackets from addresses/phones
    botResponse = botResponse
      .replace(/\[Arah Infotech/g, "Arah Infotech")
      .replace(/\[\+91/g, "+91");
  }

  return botResponse;
};

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message?.trim();
  const lowerMessage = userMessage.toLowerCase();

  if (!userMessage || isGibberish(userMessage)) {
    return res.json({ reply: "🤔 I couldn't understand. Ask about services, careers, or contact info!" });
  }

  // Check for founding-related queries first
  if (responseTemplates.founding.triggers.some(t => lowerMessage.includes(t))) {
    return res.json({ reply: responseTemplates.founding.response });
  }

  // Check other templates
  for (const template of Object.values(responseTemplates)) {
    if (template !== responseTemplates.founding && template.triggers.some(t => lowerMessage.includes(t))) {
      return res.json({ reply: template.response });
    }
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro", // <-- FIXED MODEL NAME
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 150,
        topP:0.9
      }
    });
    const result = await model.generateContent(userMessage);
    const response = await result.response;
    let text = response.text();
 if (userMessage.toLowerCase().includes("service")) {
      text = "We offer:\n- Web Development\n- Artificial Intelligence\n- Digital Marketing\n- Cloud Security";
      if (response.redirect) delete response.redirect;
    }

    // Force exact clients response
    if (userMessage.toLowerCase().includes("client")) {
      text = "Our clients include Google, Intel, and Amazon.";
    }
    // Apply enforcement rules
    text = enforceResponseRules(userMessage, text);

    let redirect;
    if (text.includes('"redirect":')) {
      redirect = text.match(/"redirect":\s*"(\w+)_page"/)?.[1];
    }

    // Safety checks
    if (lowerMessage.includes("address") && !text.includes("Spline Arcade")) {
      text = responseTemplates.location.response;
    }
    if (lowerMessage.includes("email") && !text.includes("ops@arahinfotech.net")) {
      text = responseTemplates.email.response;
    }
    if (lowerMessage.includes("phone") && !text.includes("+91 89198 01095")) {
      text = responseTemplates.phone.response;
    }
   
if (lowerMessage.includes("service")) {
  return res.json({ reply: responseTemplates.services.response });
}
if (lowerMessage.includes("client")) {
  return res.json({ reply: responseTemplates.clients.response });
}


    // Force corrections
    text = text
      .replace(/Arab|Anh/g, "Arah")
      .replace(/anahinfotech/g, "arahinfotech")
      .replace(/opz/g, "ops");

    if (redirect) {
      return res.json({ 
        reply: text,
        redirect: `https://arahinfotech.net/${redirect}`
      });
    }
    res.json({ reply: text });
  } catch (error) {
    console.error("API Error:", error);

    // Fallback for known queries
    for (const template of Object.values(responseTemplates)) {
      if (template.triggers.some(t => lowerMessage.includes(t))) {
        return res.json({ reply: template.response });
      }
    }

    // Generic fallback
    return res.json({ reply: "😔 Sorry, something went wrong. Please try again later!" });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));