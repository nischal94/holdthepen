import { ClaimForm } from "./components/claim-form";
import { ClaimProvider } from "@/lib/react/claim-context";

export default function HomePage() {
  return (
    <ClaimProvider>
      <ClaimForm />
    </ClaimProvider>
  );
}
