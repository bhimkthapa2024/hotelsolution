// Login route layout — intentionally minimal.
// The root layout (src/app/layout.tsx) handles <html> and <body>.
// This layout simply opts the login page out of MainLayout via ConditionalLayout.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
