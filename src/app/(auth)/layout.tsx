// The account screens: a side panel on the left and the form on the right,
// as drawn on the Figma frames Sign Up (30:135), Log in (32:505) and Check
// inbox (32:1861). Each page brings its own panel through AuthShell; this
// layout only lays the two side by side from 1024 px and stacks them below.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main id="main" className="flex flex-1 flex-col lg:flex-row">{children}</main>;
}
