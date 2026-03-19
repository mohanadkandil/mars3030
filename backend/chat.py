#!/usr/bin/env python3
"""
Interactive Chat with Mars Crop Knowledge Base via MCP
"""

import asyncio
from mcp_client import MCPClient


async def chat():
    print("\n" + "=" * 60)
    print("🌱 RedHarvester - Mars Agriculture Assistant")
    print("=" * 60)
    print("Connected to Syngenta Knowledge Base via MCP")
    print("Type 'quit' to exit\n")

    client = MCPClient()

    print("Initializing MCP connection...")
    init_result = await client.initialize()
    print(f"Connected!\n")

    while True:
        try:
            user_input = input("👤 You: ").strip()

            if not user_input:
                continue

            if user_input.lower() in ['quit', 'exit', 'q']:
                print("\nGoodbye!")
                break

            print("\nRedHarvester: Thinking...")

            result = await client.query_knowledge_base(user_input)

            print(f"\nRedHarvester:\n{result}\n")
            print("-" * 60 + "\n")

        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"\nError: {e}\n")

    await client.close()


if __name__ == "__main__":
    asyncio.run(chat())
