import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

// Service role so prices are trusted server-side (never expose this key in client)
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { cart } = req.body || {};
    if (!Array.isArray(cart) || !cart.length) return res.status(400).json({ error: "Cart empty" });

    // Fetch products
    const ids = [...new Set(cart.map(i => i.product_id))];
    const { data: products, error } = await sb
      .from("products")
      .select("id,title,price_jmd,active")
      .in("id", ids);

    if (error) return res.status(500).json({ error: error.message });

    const map = new Map((products || []).map(p => [p.id, p]));

    // Build Stripe line items
    const line_items = [];
    const normalizedItems = [];

    for (const item of cart) {
      const p = map.get(item.product_id);
      const qty = Math.max(1, parseInt(item.qty || 1, 10));
      if (!p || !p.active) continue;

      line_items.push({
        quantity: qty,
        price_data: {
          currency: "jmd",
          product_data: { name: p.title },
          unit_amount: p.price_jmd
        }
      });

      normalizedItems.push({ product_id: p.id, title: p.title, qty, unit_amount: p.price_jmd });
    }

    if (!line_items.length) return res.status(400).json({ error: "No purchasable items in cart" });

    // Create a pending order first
    const amount_total = normalizedItems.reduce((s, i) => s + (i.qty * i.unit_amount), 0);

    const { data: order, error: orderErr } = await sb
      .from("orders")
      .insert({
        status: "pending",
        currency: "jmd",
        amount_total,
        items: normalizedItems
      })
      .select("id")
      .single();

    if (orderErr) return res.status(500).json({ error: orderErr.message });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: `${process.env.PUBLIC_SITE_URL}/store-success.html?order=${order.id}`,
      cancel_url: `${process.env.PUBLIC_SITE_URL}/cart.html`,
      metadata: { order_id: order.id, kind: "store" }
    });

    // Save session id
    await sb.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
