import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import axios from "axios";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  // Check authentication
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get GitHub Token
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return NextResponse.json({ error: "Serverio konfigūracijoje trūksta GITHUB_TOKEN" }, { status: 500 });
  }

  // Define repo details (could be vars too)
  // Assuming the user is running this from their own repo context or a fixed one. 
  // We need to know OWNER and REPO. 
  // Let's try to get them from ENV or use a default if it's a known fork.
  // Best practice: GITHUB_REPOSITORY="owner/repo"
  
  const repoString = process.env.GITHUB_REPOSITORY; // e.g. "GrybasTV/fb-discord-notifier"
  if (!repoString) {
     return NextResponse.json({ error: "Serverio konfigūracijoje trūksta GITHUB_REPOSITORY (pvz. 'owner/repo')" }, { status: 500 });
  }

  const workflowId = "scrape.yaml"; // The filename of the workflow

  try {
    await axios.post(
      `https://api.github.com/repos/${repoString}/actions/workflows/${workflowId}/dispatches`,
      {
        ref: "main" // The branch to run on
      },
      {
        headers: {
          "Authorization": `Bearer ${githubToken}`,
          "Accept": "application/vnd.github.v3+json",
          "X-GitHub-Api-Version": "2022-11-28"
        }
      }
    );

    return NextResponse.json({ success: true, message: "Scraperis paleistas! Tai gali užtrukti kelias minutes." });
  } catch (error: any) {
    console.error("GitHub Dispatch Error:", error.response?.data || error.message);
    return NextResponse.json({ 
        error: "Nepavyko paleisti GitHub Action. Patikrinkite GITHUB_TOKEN teises ir Workflow failo pavadinimą.",
        details: error.response?.data?.message
    }, { status: 500 });
  }
}
