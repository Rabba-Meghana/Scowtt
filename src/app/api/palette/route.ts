import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  
  if (!url) {
    return NextResponse.json({ dark: "#06060A", mid: "#12121E", accent: "#C9A84C" });
  }

  try {
    console.log("[palette] Fetching image:", url);
    
    // Fetch the image
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    
    // Use sharp to decode the image and get actual pixels
    const image = sharp(Buffer.from(buffer));
    const { data, info } = await image
      .resize(100, 150)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    console.log(`[palette] Decoded: ${info.width}x${info.height}, ${data.length} pixels`);
    
    // Find the most vibrant, non-gray color
    let bestR = 0, bestG = 0, bestB = 0;
    let bestScore = -1;
    
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Skip very dark or very light pixels
      const brightness = (r + g + b) / 3;
      if (brightness < 50 || brightness > 200) continue;
      
      // Calculate colorfulness (how far from gray)
      const colorfulness = Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r);
      if (colorfulness < 40) continue;
      
      // Score: prefer vibrant, mid-tone colors
      const score = colorfulness * (1 - Math.abs(brightness - 128) / 128);
      
      if (score > bestScore) {
        bestScore = score;
        bestR = r;
        bestG = g;
        bestB = b;
      }
    }
    
    // If no vibrant color found, fall back to most common color
    if (bestScore === -1) {
      const colorCounts = new Map<string, number>();
      for (let i = 0; i < data.length; i += 3) {
        const r = Math.floor(data[i] / 32) * 32;
        const g = Math.floor(data[i+1] / 32) * 32;
        const b = Math.floor(data[i+2] / 32) * 32;
        const key = `${r},${g},${b}`;
        colorCounts.set(key, (colorCounts.get(key) || 0) + 1);
      }
      
      let maxCount = 0;
      let dominantKey = "";
      for (const [key, count] of colorCounts) {
        if (count > maxCount) {
          maxCount = count;
          dominantKey = key;
        }
      }
      
      const [r, g, b] = dominantKey.split(",").map(Number);
      bestR = r + 16;
      bestG = g + 16;
      bestB = b + 16;
    }
    
    // Generate palette from the extracted color
    const accent = `#${bestR.toString(16).padStart(2, "0")}${bestG.toString(16).padStart(2, "0")}${bestB.toString(16).padStart(2, "0")}`;
    const mid = `#${Math.floor(bestR * 0.25).toString(16).padStart(2, "0")}${Math.floor(bestG * 0.25).toString(16).padStart(2, "0")}${Math.floor(bestB * 0.25).toString(16).padStart(2, "0")}`;
    const dark = `#${Math.floor(bestR * 0.1).toString(16).padStart(2, "0")}${Math.floor(bestG * 0.1).toString(16).padStart(2, "0")}${Math.floor(bestB * 0.1).toString(16).padStart(2, "0")}`;
    
    console.log(`[palette] ✅ Extracted: RGB(${bestR},${bestG},${bestB}) -> Accent: ${accent}`);
    
    return NextResponse.json({ dark, mid, accent });
    
  } catch (err) {
    console.error("[palette] Error:", err);
    return NextResponse.json({ dark: "#06060A", mid: "#12121E", accent: "#C9A84C" });
  }
}