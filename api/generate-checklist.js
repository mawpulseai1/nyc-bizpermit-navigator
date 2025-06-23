import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(request, response) {
    // Only allow POST requests for security
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    // Access the API Key securely from environment variables
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        return response.status(500).json({ error: 'Server configuration error: API Key not found.' });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Using the Flash model

    // Extract user input from the request body
    const { businessType, specificDetails, borough } = request.body;

    // --- My Super-Genius Prompt Engineering for NYC BizPermit Navigator ---
    const prompt = `
    Act as an expert in New York City small business permits and licenses for a new entrepreneur.
    The user wants to start a "<span class="math-inline">\{businessType\}" business, described as "</span>{specificDetails}", located in "${borough}" borough of NYC.

    Your task is to provide a comprehensive, actionable, and simplified checklist for *initial* business registration, permits, and licenses required at the City, State, and relevant Federal levels for this specific type of small business in NYC.

    **Output Format:**
    Provide the information as a numbered list of steps. For each step, include:
    1.  **Permit/License Name:** (e.g., "NYC Department of Consumer and Worker Protection General Vendor License")
    2.  **Purpose:** (A brief, plain-language explanation of why it's needed)
    3.  **Key Requirements/Documents:** (e.g., "EIN", "proof of address", "business plan")
    4.  **Estimated Cost/Fee:** (State if free, or estimate a range like "$25 - $100". If unknown, state "Varies").
    5.  **Official Source/Link:** (Provide a relevant official government website link if possible, or state "Search NYC official government websites for exact link")
    6.  **Important Tip/Common Pitfall:** (A specific piece of advice for this step to save time/money or avoid issues)

    Focus on initial registration and common permits for small-scale operations. If a permit is very specific and unlikely for a general small business of this type, you may omit it or state it as "potentially required depending on specific operations".

    Ensure the language is clear, concise, and actionable for a non-expert. Prioritize the most common and critical initial steps.
    If the business type is "other," provide a general guide but highlight that specific details are crucial.
    If the borough is "Staten Island", briefly mention any specific nuances if applicable, but generally NYC laws apply across boroughs with some variations.
    `;
    // --- End of Prompt Engineering ---

    try {
        const result = await model.generateContent(prompt);
        const apiResponse = result.response.text();

        // Format the AI response for easier display on the frontend
        // This is a simple formatting, we can make it more robust later
        const formattedResponse = apiResponse.split('\n').filter(line => line.trim() !== '').map(line => {
            if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.') || line.startsWith('5.') || line.startsWith('6.')) {
                const parts = line.split(':');
                if (parts.length > 1) {
                    return `<li><strong>${parts[0].trim()}:</strong> ${parts.slice(1).join(':').trim()}</li>`;
                }
            }
            return `<li>${line.trim()}</li>`;
        }).join('');


        return response.status(200).json({ checklist: `<ul>${formattedResponse}</ul>` });

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return response.status(500).json({ error: 'Failed to generate checklist. Please try again or refine your description.' });
    }
}