Task ID: 2
Agent: Main Agent
Task: Fix virtual try-on engine to prioritize HF Gradio when token configured, detect billing errors early

Summary:
- Modified 3 files: external-ai.ts, virtual-tryon.ts, route.ts
- Upgraded virtual try-on from v18 to v19
- Key changes:
  1. external-ai.ts: Early exit on billing errors in openAITryOn() GPT-Image-1 and DALL-E 3 catch blocks
  2. virtual-tryon.ts: Added isHuggingFaceConfigured() export, reordered strategies (HF Gradio first when token configured), added billing/credit failure flags, added specific error message for HF Gradio never reached
  3. route.ts: Import and use isHuggingFaceConfigured() for huggingfaceConfigured status field
- Commit: 88ffa45 pushed to origin/main
