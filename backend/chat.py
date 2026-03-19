#!/usr/bin/env python3
import asyncio
from mcp_client import MCPClient


async def chat():
    print("\n" + "=" * 60)
    print("🌱 CERES — Crop Environment Resource & Evaluation System")
    print("=" * 60)
    print("Connected to Syngenta Mars Crop Knowledge Base via MCP")
    print("Type 'quit' to exit\n")

    client = MCPClient()

    print("Initializing MCP connection...")
    await client.initialize()
    print("Connected!\n")

    while True:
        try:
            user_input = input("👤 You: ").strip()

            if not user_input:
                continue

            if user_input.lower() in ['quit', 'exit', 'q']:
                print("\nGoodbye!")
                break

            print("\n🌱 CERES: Thinking...")

            result = await client.query_knowledge_base(user_input)

            print(f"\n🌱 CERES:\n{result}\n")
            print("-" * 60 + "\n")

        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"\nError: {e}\n")

    await client.close()


if __name__ == "__main__":
    asyncio.run(chat())
