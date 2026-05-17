import { Redirect } from 'expo-router';

export default function Index() {
  // In production: check auth state here and redirect accordingly
  return <Redirect href="/(auth)/onboarding" />;
}
