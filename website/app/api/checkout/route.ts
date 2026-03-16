import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

const VALID_PLATFORMS = ["macos", "linux"] as const;

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    const { amount, platform } = await req.json();

    if (!VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const origin = req.nextUrl.origin;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      success_url: `${origin}/download/success?session_id={CHECKOUT_SESSION_ID}&platform=${platform}`,
      cancel_url: `${origin}/download`,
    };

    if (numAmount > 0) {
      sessionParams.mode = "payment";
      sessionParams.line_items = [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(numAmount * 100),
            product_data: { name: "Claude Cursor" },
          },
          quantity: 1,
        },
      ];
    } else {
      sessionParams.mode = "setup";
      sessionParams.customer_creation = "always";
      sessionParams.payment_method_types = ["card"];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
