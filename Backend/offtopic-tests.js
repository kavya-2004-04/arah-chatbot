const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const SYSTEM_PROMPT = `
You are ArahBot. Follow these rules in JSON format:
{
NEW RULES:
1. Always provide DIRECT ANSWERS first for valid Arah Infotech queries
2. Only suggest email/contact when:
   - User asks for custom solutions
   - Technical support is needed
   - Explicitly asked for contact
3. Never redirect these to email:
   - Address/phone requests
   - Service listings
   - Career information
   - Company details
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
    }
  },

  "rejection_examples": {
    "cricket_scores": "This query is unrelated to Arah Infotech. Ask about our services, vision, or careers."
  }
ADD THIS RULE:
"response_formatting": {
  "remove_brackets": true,
  "address_format": "Plain text without brackets"
}
`;
// 2. Create the temporary modified version
const tempPrompt = SYSTEM_PROMPT + `
ADD THESE RULES:
1. Always answer DIRECTLY for:
   - Address requests
   - Service inquiries
   - Career questions
   - Company information
2. Only redirect to email for:
   - Custom project inquiries
   - Technical support issues
   - When explicitly asked for contact
3. Response format:
   - Remove all square brackets [] from addresses
   - Present phone numbers without brackets
`;
const TEST_CONFIG = {
  rejectionPhrases: [
    "I specialize in Arah Infotech-related queries",
    "unrelated to Arah Infotech"
  ],
  addressPhrases: [
    "Arah Infotech Pvt Ltd",
    "2nd Floor, Spline Arcade",
    "Madhapur, Hyderabad"
  ]
};
async function runTests() {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash", // Updated to latest model
    systemInstruction: tempPrompt,
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 200
    }
  });
  const tests = [
    // Off-topic tests
    { input: "Weather forecast", type: "reject" },
    { input: "Cricket scores", type: "reject" },
    
    // Auto-correction tests
    { input: "Anh Infotech address", type: "address" },
    { input: "Email openplayer", type: "correction" },
    
    // Positive cases
    { input: "Your services", type: "services" },
    { input: "Career opportunities", type: "careers" }
  ];

  let passed = 0;
  for (const test of tests) {
    const result = await model.generateContent(test.input);
    const text = (await result.response).text();
    
    console.log(`\nTest: ${test.input}`);
    console.log(`Response: ${text}`);

    const isPass = checkTestResult(test.type, text);
    console.log(isPass ? "✅ PASS" : "❌ FAIL");
    if (isPass) passed++;
  }

  console.log(`\nFinal Result: ${passed}/${tests.length} passed`);
  process.exit(passed === tests.length ? 0 : 1);
}
function checkTestResult(type, response) {
  const lowerResponse = response.toLowerCase();
  
  switch(type) {
    case "reject":
      return TEST_CONFIG.rejectionPhrases.some(phrase => 
        lowerResponse.includes(phrase.toLowerCase()));
      
    case "address":
      return  [
        "arah infotech pvt ltd",
        "2nd floor", 
        "spline arcade",
        "Hyderabad, Telangana"
    ].every(phrase =>
        lowerResponse.includes(phrase.toLowerCase()));
      
    case "correction":
      return lowerResponse.includes("ops@arahinfotech.net");
      
    case "services":
      return /web development|artificial intelligence|digital marketing|cloud security/i.test(response);
       case "careers":
      return /career|apply|job|opening/i.test(response);
  }
}

runTests();