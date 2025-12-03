import { StripeProvider, useStripe } from '@stripe/stripe-react-native';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!;

export { StripeProvider, useStripe, STRIPE_PUBLISHABLE_KEY };