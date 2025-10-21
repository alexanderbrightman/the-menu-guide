import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
})

export const STRIPE_CONFIG = {
  priceId: process.env.STRIPE_PRICE_ID || 'price_1234567890', // You'll need to create this in Stripe
  currency: 'usd',
  interval: 'month',
  amount: 1800, // $18.00 in cents
}
