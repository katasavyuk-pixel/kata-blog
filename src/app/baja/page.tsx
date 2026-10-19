import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Baja", robots: { index: false } };

export default function BajaPage() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-[66ch]">
        <h1 className="text-h1">
          Te has dado de baja
        </h1>
        <p className="mt-4 text-muted">
          No recibirás más emails. Si fue un error, puedes volver a suscribirte
          cuando quieras.
        </p>
        <div className="mt-8 font-sans">
          <Button href="/">Volver al inicio</Button>
        </div>
      </div>
    </Container>
  );
}
