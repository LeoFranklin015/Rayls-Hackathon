import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return Response.json({ error: "Missing address" }, { status: 400 });
  }

  const res = await fetch("https://testnet-rpc.rayls.com/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
  });

  const json = await res.json();
  return Response.json({ balance: json.result ?? "0x0" });
}
