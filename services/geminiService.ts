import { GoogleGenAI } from "@google/genai";
import { Session, AggregatedItem } from "../types";

export const generateVendorEmail = async (session: Session, aggregatedItems: AggregatedItem[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const itemsList = aggregatedItems.map(item => `- ${item.count}x ${item.name}`).join('\n');
  const totalCost = aggregatedItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2);
  
  const prompt = `
    You are an AI assistant for a breakfast ordering system called "YallaFtar".
    Please draft a polite and professional email to a catering restaurant to place a group order.
    
    Session Name: ${session.name}
    Total Expected Cost: EGP ${totalCost}
    
    Order Items:
    ${itemsList}
    
    Please include placeholders for [Restaurant Name] and [Pickup Time].
    Keep it concise and clear.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "Could not generate email draft.";
  } catch (error) {
    console.error("Error generating vendor email:", error);
    return "Error: Could not connect to AI service to generate email. Please check your API key.";
  }
};

export const analyzeOrderTrends = async (session: Session): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Prepare a simplified JSON of orders for the AI
    const orderData = session.orders.map(o => ({
        user: o.userName,
        items: o.items.map(i => i.name)
    }));
    const orderJson = JSON.stringify(orderData);

    const prompt = `
        Analyze the following breakfast orders and give a fun, 1-sentence "Team Breakfast Vibe" description. 
        Are they healthy eaters, caffeine addicts, or carb lovers?
        
        Orders: ${orderJson}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "Enjoy your breakfast!";
    } catch (error) {
        return "Looks like a delicious breakfast!";
    }
}