require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const SYSTEM_PROMPT = `
You are ArahBot, an AI assistant for Arah Infotech Pvt Ltd (Hyderabad, India). 
STRICTLY use ONLY these verified details:

**Company Details:**
- Address: 2nd Floor, Spline Arcade, Ayyappa Society Main Road, Madhapur, Hyderabad, Telangana-500081
- Email: ops@arahinfotech.net
- Phone: +91 89198 01095 / +91 63042 44117
- Website: https://arahinfotech.net

**Services (ONLY THESE 4):**
1. Web/Mobile Development
2. AI/ML Solutions
3. Cloud Services
4. Cybersecurity

**Rules:**
- NEVER invent details. If unsure, respond: "Please visit https://arahinfotech.net"
- AUTOCORRECT typos ("Arab" → "Arah", "Anh" → "Arah")
- REJECT requests for unrelated information
`;

const TEST_CASES = [
  { 
    input: "What is Arah Infotech's address?", 
    expected: "Spline Arcade",
    required: true
  },
  { 
    input: "Email contact?", 
    expected: "ops@arahinfotech.net",
    required: true
  },
  { 
    input: "Services offered?", 
    expected: ["Web/Mobile", "AI/ML", "Cloud", "Cybersecurity"],
    minMatches: 3 // At least 3 of 4 services must be mentioned
  },
  { 
    input: "Phone number?", 
    expected: "+91 89198 01095",
    required: true
  },
  { 
    input: "Where is Arab Infotech?", 
    expected: "Arah Infotech", // Tests autocorrection
    required: true
  }
];

async function testGemini() {
  try {
    console.log("🚀 Starting Gemini 2.0 Flash tests...");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.3, // Reduce randomness
        maxOutputTokens: 150 // Keep responses concise
      }
    });

    let passedTests = 0;
    
    for (const test of TEST_CASES) {
      try {
        console.log(`\n--- Testing: "${test.input}" ---`);
        const result = await model.generateContent(test.input);
        const response = await result.response;
        let text = response.text();

        // --- Critical Validation Checks --- //
        if (test.required && !text.includes(test.expected)) {
          throw new Error(`MISSING REQUIRED: "${test.expected}"`);
        }

        if (test.minMatches) {
          const matches = test.expected.filter(term => text.includes(term));
          if (matches.length < test.minMatches) {
            throw new Error(`INSUFFICIENT MATCHES: Found only ${matches.length}/${test.minMatches} required services`);
          }
        }

        // --- Output Results --- //
        console.log(`✅ Response: ${text}`);
        passedTests++;
        console.log("🟢 PASSED");
        
      } catch (error) {
        console.error(`❌ FAILED: ${error.message}`);
        console.log("🔴 TEST FAILED");
      }
    }

    // --- Final Summary --- //
    console.log(`\n📊 Results: ${passedTests}/${TEST_CASES.length} tests passed`);
    if (passedTests === TEST_CASES.length) {
      console.log("🎉 All tests passed successfully!");
    } else {
      console.log("⚠️  Some tests failed - check the errors above");
    }

  } catch (error) {
    console.error("🔥 CRITICAL ERROR:", error);
  }
}

// Execute with error handling
testGemini().catch(err => console.error("💥 Unhandled error:", err));